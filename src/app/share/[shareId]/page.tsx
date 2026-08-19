import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CollaborativeWorkspace } from "~/features/collaboration/collaborative-workspace";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareId, shareId),
  });
  if (project?.visibility !== "anyone_with_link") notFound();
  return (
    <CollaborativeWorkspace
      roomId={project.roomId}
      projectTitle={project.title}
      readOnly
      visibility={project.visibility}
    />
  );
}
