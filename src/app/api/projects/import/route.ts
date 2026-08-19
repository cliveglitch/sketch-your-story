import { fileTypeFromBuffer } from "file-type";
import JSZip from "jszip";
import {
  LiveObject,
  toPlainLson,
  type PlainLsonObject,
} from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { UTApi } from "uploadthing/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  archiveManifestSchema,
  archiveProjectSchema,
  migrateStoryDocument,
  remapStoryDocument,
  remapWorkspaceSnapshot,
} from "~/lib/story-document";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { assets, projectMembers, projects } from "~/server/db/schema";

export const runtime = "nodejs";
const MAX_ARCHIVE_SIZE = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.LIVEBLOCKS_SECRET_KEY || !process.env.UPLOADTHING_TOKEN)
    return NextResponse.json(
      { error: "Import services are not configured" },
      { status: 503 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "A project archive is required" },
      { status: 400 },
    );
  if (file.size > MAX_ARCHIVE_SIZE)
    return NextResponse.json(
      { error: "Archives may not exceed 100 MB" },
      { status: 413 },
    );
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  for (const name of Object.keys(zip.files))
    if (name.startsWith("/") || name.includes("..") || name.includes("\\"))
      return NextResponse.json(
        { error: "The archive contains an unsafe path" },
        { status: 400 },
      );
  const manifestEntry = zip.file("manifest.json");
  const projectEntry = zip.file("project.json");
  if (!manifestEntry || !projectEntry)
    return NextResponse.json(
      { error: "This is not a Sketch Your Story archive" },
      { status: 400 },
    );
  const manifest = archiveManifestSchema.parse(
    JSON.parse(await manifestEntry.async("string")),
  );
  if (manifest.schemaVersion > 1)
    return NextResponse.json(
      { error: `Schema version ${manifest.schemaVersion} is not supported` },
      { status: 422 },
    );
  const imported = archiveProjectSchema.parse(
    JSON.parse(await projectEntry.async("string")),
  );
  let document = remapStoryDocument(migrateStoryDocument(imported.document));
  const canvasSnapshot = remapWorkspaceSnapshot(imported.canvasSnapshot);
  const projectId = crypto.randomUUID();
  const roomId = `project:${projectId}`;
  const uploadedKeys: string[] = [];
  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });
  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  try {
    await db.insert(projects).values({
      id: projectId,
      roomId,
      ownerId: session.user.id,
      title: imported.title,
      description: imported.description,
      visibility: "restricted",
    });
    await db
      .insert(projectMembers)
      .values({ projectId, userId: session.user.id, role: "owner" });
    const assetIdMap = new Map<string, string>();
    for (const archivedAsset of imported.assets) {
      const entry = zip.file(archivedAsset.path);
      if (!entry) throw new Error(`Missing asset ${archivedAsset.path}`);
      const bytes = await entry.async("uint8array");
      if (
        bytes.byteLength !== archivedAsset.size ||
        bytes.byteLength > 10 * 1024 * 1024
      )
        throw new Error(`Invalid size for ${archivedAsset.filename}`);
      const detected = await fileTypeFromBuffer(bytes);
      if (
        detected?.mime !== archivedAsset.contentType ||
        !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)
      )
        throw new Error(`Invalid image ${archivedAsset.filename}`);
      const fileBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const upload = await utapi.uploadFiles(
        new File([fileBuffer], archivedAsset.filename, { type: detected.mime }),
      );
      if (upload.error) throw new Error(upload.error.message);
      const newId = crypto.randomUUID();
      uploadedKeys.push(upload.data.key);
      assetIdMap.set(archivedAsset.id, newId);
      await db.insert(assets).values({
        id: newId,
        projectId,
        uploadedById: session.user.id,
        storageKey: upload.data.key,
        url: upload.data.ufsUrl,
        filename: archivedAsset.filename,
        contentType: detected.mime,
        size: bytes.byteLength,
      });
    }
    document = {
      ...document,
      entities: Object.fromEntries(
        Object.entries(document.entities).map(([entityId, entity]) => [
          entityId,
          entity.kind === "character" && entity.imageAssetId
            ? {
                ...entity,
                imageAssetId: assetIdMap.get(entity.imageAssetId) ?? null,
              }
            : entity,
        ]),
      ),
    };
    const plainDocument = toPlainLson(
      new LiveObject({
        document: new LiveObject(document),
        canvasSnapshot: JSON.stringify(canvasSnapshot),
      }),
    ) as PlainLsonObject;
    await liveblocks.initializeStorageDocument(roomId, plainDocument);
    return NextResponse.json({ projectId }, { status: 201 });
  } catch (error) {
    await Promise.allSettled([
      liveblocks.deleteRoom(roomId),
      uploadedKeys.length ? utapi.deleteFiles(uploadedKeys) : Promise.resolve(),
      db.delete(projects).where(eq(projects.id, projectId)),
    ]);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 422 },
    );
  }
}
