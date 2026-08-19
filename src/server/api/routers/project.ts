import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  invitations,
  projectMembers,
  projects,
  users,
} from "~/server/db/schema";
import { getProjectAccess } from "~/server/project-access";

const projectId = z.string().uuid();
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "untitled-story";
const forbidden = () => new TRPCError({ code: "FORBIDDEN" });

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ project: projects, role: projectMembers.role })
      .from(projects)
      .leftJoin(
        projectMembers,
        and(
          eq(projectMembers.projectId, projects.id),
          eq(projectMembers.userId, ctx.session.user.id),
        ),
      )
      .where(
        or(
          eq(projects.ownerId, ctx.session.user.id),
          eq(projectMembers.userId, ctx.session.user.id),
        ),
      )
      .orderBy(desc(projects.updatedAt));
    return rows.map(({ project, role }) => ({
      ...project,
      role: project.ownerId === ctx.session.user.id ? ("owner" as const) : role,
    }));
  }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().max(5000).default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const roomId = `project:${id}`;
      const [project] = await ctx.db
        .insert(projects)
        .values({
          id,
          roomId,
          ownerId: ctx.session.user.id,
          title: input.title,
          description: input.description,
        })
        .returning();
      await ctx.db
        .insert(projectMembers)
        .values({ projectId: id, userId: ctx.session.user.id, role: "owner" });
      return project;
    }),
  get: protectedProcedure
    .input(z.object({ id: projectId }))
    .query(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (!access?.role) throw forbidden();
      return access;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: projectId,
        title: z.string().trim().min(1).max(120).optional(),
        description: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (!access || !["owner", "editor"].includes(access.role ?? ""))
        throw forbidden();
      const { id, ...values } = input;
      const [project] = await ctx.db
        .update(projects)
        .set(values)
        .where(eq(projects.id, id))
        .returning();
      return project;
    }),
  setVisibility: protectedProcedure
    .input(
      z.object({
        id: projectId,
        visibility: z.enum(["restricted", "anyone_with_link", "public"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (access?.role !== "owner") throw forbidden();
      const publicSlug =
        input.visibility === "public"
          ? `${slugify(access.project.title)}-${access.project.id.slice(0, 8)}`
          : null;
      const [project] = await ctx.db
        .update(projects)
        .set({ visibility: input.visibility, publicSlug })
        .where(eq(projects.id, input.id))
        .returning();
      return project;
    }),
  createInvitation: protectedProcedure
    .input(
      z.object({
        id: projectId,
        role: z.enum(["editor", "viewer"]),
        expiresInDays: z.number().int().min(1).max(30).default(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (access?.role !== "owner") throw forbidden();
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
      await ctx.db.insert(invitations).values({
        projectId: input.id,
        role: input.role,
        tokenHash,
        expiresAt,
        createdById: ctx.session.user.id,
      });
      return {
        token,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`,
        expiresAt,
      };
    }),
  addMember: protectedProcedure
    .input(
      z.object({
        id: projectId,
        githubLogin: z.string().trim().min(1).max(255),
        role: z.enum(["editor", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (access?.role !== "owner") throw forbidden();
      const member = await ctx.db.query.users.findFirst({
        where: ilike(users.githubLogin, input.githubLogin),
      });
      if (!member)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That GitHub user has not joined Sketch Your Story yet.",
        });
      await ctx.db
        .insert(projectMembers)
        .values({ projectId: input.id, userId: member.id, role: input.role })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role: input.role },
        });
      return {
        id: member.id,
        name: member.name,
        githubLogin: member.githubLogin,
        role: input.role,
      };
    }),
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string().min(20).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const invitation = await ctx.db.query.invitations.findFirst({
        where: eq(invitations.tokenHash, tokenHash),
      });
      if (
        !invitation ||
        invitation.revokedAt ||
        invitation.consumedAt ||
        invitation.expiresAt <= new Date()
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is invalid or has expired.",
        });
      await ctx.db
        .insert(projectMembers)
        .values({
          projectId: invitation.projectId,
          userId: ctx.session.user.id,
          role: invitation.role,
        })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role: invitation.role },
        });
      await ctx.db
        .update(invitations)
        .set({ consumedAt: new Date(), consumedById: ctx.session.user.id })
        .where(
          and(
            eq(invitations.id, invitation.id),
            eq(invitations.tokenHash, tokenHash),
          ),
        );
      return { projectId: invitation.projectId };
    }),
  removeMember: protectedProcedure
    .input(z.object({ id: projectId, userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );
      if (access?.role !== "owner" || input.userId === access.project.ownerId)
        throw forbidden();
      await ctx.db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, input.id),
            eq(projectMembers.userId, input.userId),
          ),
        );
      return { ok: true };
    }),
});
