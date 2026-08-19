import { notFound, redirect } from "next/navigation";
import { CollaborativeWorkspace } from "~/features/collaboration/collaborative-workspace";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getProjectAccess } from "~/server/project-access";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { id } = await params;
  const access = await getProjectAccess(db, id, session.user.id);
  if (!access?.role) notFound();
  return (
    <CollaborativeWorkspace
      roomId={access.project.roomId}
      projectTitle={access.project.title}
      readOnly={access.role === "viewer"}
      projectId={access.project.id}
      shareId={access.project.shareId}
      publicSlug={access.project.publicSlug}
      visibility={access.project.visibility}
      canManage={access.role === "owner"}
    />
  );
}
