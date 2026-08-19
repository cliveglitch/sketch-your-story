import { and, eq } from "drizzle-orm";
import type { ProjectRole } from "~/lib/story-document";
import type { db as database } from "~/server/db";
import { projectMembers, projects } from "~/server/db/schema";

type Database = typeof database;

export async function getProjectAccess(
  db: Database,
  projectId: string,
  userId?: string | null,
) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;
  let role: ProjectRole | null = project.ownerId === userId ? "owner" : null;
  if (!role && userId) {
    const membership = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    });
    role = membership?.role ?? null;
  }
  return { project, role };
}

export function requireRole(role: ProjectRole | null, allowed: ProjectRole[]) {
  if (!role || !allowed.includes(role)) throw new Error("FORBIDDEN");
}
