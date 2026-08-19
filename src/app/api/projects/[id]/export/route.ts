import JSZip from "jszip";
import { eq } from "drizzle-orm";
import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { assets } from "~/server/db/schema";
import { getProjectAccess } from "~/server/project-access";
import {
  archiveManifestSchema,
  archiveProjectSchema,
  migrateStoryDocument,
} from "~/lib/story-document";

export const runtime = "nodejs";
const extensionFor = (type: string) =>
  type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const access = await getProjectAccess(db, id, session.user.id);
  if (!access?.role)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.LIVEBLOCKS_SECRET_KEY)
    return NextResponse.json(
      { error: "Realtime storage is not configured" },
      { status: 503 },
    );
  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });
  const storage = await liveblocks.getStorageDocument(
    access.project.roomId,
    "json",
  );
  const document = migrateStoryDocument(
    "document" in storage ? storage.document : storage,
  );
  const canvasSnapshot = archiveProjectSchema.shape.canvasSnapshot.parse(
    typeof storage.canvasSnapshot === "string"
      ? JSON.parse(storage.canvasSnapshot)
      : { nodes: [], edges: [], acts: [] },
  );
  const projectAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.projectId, id));
  const zip = new JSZip();
  const assetManifest: Array<{
    id: string;
    filename: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    size: number;
    path: string;
  }> = [];
  for (const asset of projectAssets) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(asset.contentType))
      continue;
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Could not fetch asset ${asset.id}`);
    const path = `assets/${asset.id}.${extensionFor(asset.contentType)}`;
    zip.file(path, await response.arrayBuffer());
    assetManifest.push({
      id: asset.id,
      filename: asset.filename,
      contentType: asset.contentType as
        "image/jpeg" | "image/png" | "image/webp",
      size: asset.size,
      path,
    });
  }
  zip.file(
    "manifest.json",
    JSON.stringify(
      archiveManifestSchema.parse({
        format: "sketch-your-story",
        schemaVersion: 1,
        appVersion: "0.1.0",
        exportedAt: new Date().toISOString(),
      }),
      null,
      2,
    ),
  );
  zip.file(
    "project.json",
    JSON.stringify(
      archiveProjectSchema.parse({
        title: access.project.title,
        description: access.project.description,
        document,
        canvasSnapshot,
        assets: assetManifest,
      }),
      null,
      2,
    ),
  );
  const body = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const safeTitle =
    access.project.title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") ||
    "story";
  const bodyBuffer = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength,
  ) as ArrayBuffer;
  return new Response(bodyBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeTitle}.sketchstory.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
