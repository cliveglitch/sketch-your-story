import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CollaborativeWorkspace } from "~/features/collaboration/collaborative-workspace";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";

export const dynamic = "force-dynamic";
async function getProject(slug: string) {
  return db.query.projects.findFirst({ where: eq(projects.publicSlug, slug) });
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (project?.visibility !== "public") return {};
  return {
    title: project.title,
    description:
      project.description ||
      `Explore ${project.title}, sketched in Sketch Your Story.`,
    openGraph: {
      title: project.title,
      description: project.description || `Explore ${project.title}.`,
      images: [],
    },
    twitter: {
      title: project.title,
      description: project.description || `Explore ${project.title}.`,
      images: [],
    },
  };
}
export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (project?.visibility !== "public") notFound();
  return (
    <CollaborativeWorkspace
      roomId={project.roomId}
      projectTitle={project.title}
      readOnly
      visibility={project.visibility}
    />
  );
}
