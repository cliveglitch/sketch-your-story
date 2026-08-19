import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTableCreator,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

export const createTable = pgTableCreator(
  (name) => `sketch_your_story_${name}`,
);
export const projectRole = pgEnum("sketch_your_story_role", [
  "owner",
  "editor",
  "viewer",
]);
export const projectVisibility = pgEnum("sketch_your_story_visibility", [
  "restricted",
  "anyone_with_link",
  "public",
]);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull().unique(),
  emailVerified: d.timestamp({ mode: "date", withTimezone: true }),
  image: d.varchar({ length: 1024 }),
  githubLogin: d.varchar({ length: 255 }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
    refresh_token_expires_in: d.integer(),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const projects = createTable(
  "project",
  (d) => ({
    id: d
      .uuid()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 120 }).notNull(),
    description: d.text().notNull().default(""),
    visibility: projectVisibility().notNull().default("restricted"),
    shareId: d
      .varchar({ length: 64 })
      .notNull()
      .$defaultFn(() => crypto.randomUUID().replaceAll("-", "")),
    publicSlug: d.varchar({ length: 160 }),
    roomId: d.varchar({ length: 255 }).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("project_share_id_idx").on(t.shareId),
    uniqueIndex("project_public_slug_idx").on(t.publicSlug),
    index("project_owner_updated_idx").on(t.ownerId, t.updatedAt),
  ],
);

export const projectMembers = createTable(
  "project_member",
  (d) => ({
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRole().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index("member_user_idx").on(t.userId),
  ],
);

export const invitations = createTable(
  "invitation",
  (d) => ({
    id: d
      .uuid()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: d.varchar({ length: 64 }).notNull(),
    role: projectRole().notNull(),
    expiresAt: d.timestamp({ withTimezone: true }).notNull(),
    consumedAt: d.timestamp({ withTimezone: true }),
    consumedById: d
      .varchar({ length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    revokedAt: d.timestamp({ withTimezone: true }),
    createdAt: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (t) => [
    uniqueIndex("invitation_token_hash_idx").on(t.tokenHash),
    index("invitation_project_idx").on(t.projectId),
  ],
);

export const assets = createTable(
  "asset",
  (d) => ({
    id: d
      .uuid()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    uploadedById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: d.varchar({ length: 512 }).notNull(),
    url: d.varchar({ length: 2048 }).notNull(),
    filename: d.varchar({ length: 512 }).notNull(),
    contentType: d.varchar({ length: 100 }).notNull(),
    size: d.integer().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (t) => [
    index("asset_project_idx").on(t.projectId),
    uniqueIndex("asset_storage_key_idx").on(t.storageKey),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  memberships: many(projectMembers),
  ownedProjects: many(projects),
}));
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  assets: many(assets),
  invitations: many(invitations),
}));
export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));
export const assetsRelations = relations(assets, ({ one }) => ({
  project: one(projects, {
    fields: [assets.projectId],
    references: [projects.id],
  }),
}));
