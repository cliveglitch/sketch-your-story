import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { assets } from "~/server/db/schema";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getProjectAccess } from "~/server/project-access";

const f = createUploadthing();

export const uploadRouter = {
  characterPortrait: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .input(z.object({ projectId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const session = await auth();
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- UploadThing requires its typed transport error.
      if (!session?.user) throw new UploadThingError("Unauthorized");
      const access = await getProjectAccess(
        db,
        input.projectId,
        session.user.id,
      );
      if (!access || !["owner", "editor"].includes(access.role ?? "")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- UploadThing requires its typed transport error.
        throw new UploadThingError("Forbidden");
      }
      return { projectId: input.projectId, userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [asset] = await db
        .insert(assets)
        .values({
          projectId: metadata.projectId,
          uploadedById: metadata.userId,
          storageKey: file.key,
          url: file.ufsUrl,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        })
        .returning();
      return asset
        ? {
            id: asset.id,
            url: asset.url,
            filename: asset.filename,
            contentType: asset.contentType,
            size: asset.size,
          }
        : undefined;
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
