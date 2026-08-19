CREATE TYPE "public"."sketch_your_story_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."sketch_your_story_visibility" AS ENUM('restricted', 'anyone_with_link', 'public');--> statement-breakpoint
CREATE TABLE "sketch_your_story_account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	"refresh_token_expires_in" integer,
	CONSTRAINT "sketch_your_story_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_asset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"uploadedById" varchar(255) NOT NULL,
	"storageKey" varchar(512) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"filename" varchar(512) NOT NULL,
	"contentType" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_invitation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"role" "sketch_your_story_role" NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"consumedAt" timestamp with time zone,
	"consumedById" varchar(255),
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_project_member" (
	"projectId" uuid NOT NULL,
	"userId" varchar(255) NOT NULL,
	"role" "sketch_your_story_role" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sketch_your_story_project_member_projectId_userId_pk" PRIMARY KEY("projectId","userId")
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ownerId" varchar(255) NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" "sketch_your_story_visibility" DEFAULT 'restricted' NOT NULL,
	"shareId" varchar(64) NOT NULL,
	"publicSlug" varchar(160),
	"roomId" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" varchar(1024),
	"githubLogin" varchar(255),
	CONSTRAINT "sketch_your_story_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sketch_your_story_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sketch_your_story_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "sketch_your_story_account" ADD CONSTRAINT "sketch_your_story_account_userId_sketch_your_story_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_asset" ADD CONSTRAINT "sketch_your_story_asset_projectId_sketch_your_story_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."sketch_your_story_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_asset" ADD CONSTRAINT "sketch_your_story_asset_uploadedById_sketch_your_story_user_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_invitation" ADD CONSTRAINT "sketch_your_story_invitation_projectId_sketch_your_story_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."sketch_your_story_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_invitation" ADD CONSTRAINT "sketch_your_story_invitation_createdById_sketch_your_story_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_invitation" ADD CONSTRAINT "sketch_your_story_invitation_consumedById_sketch_your_story_user_id_fk" FOREIGN KEY ("consumedById") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_project_member" ADD CONSTRAINT "sketch_your_story_project_member_projectId_sketch_your_story_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."sketch_your_story_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_project_member" ADD CONSTRAINT "sketch_your_story_project_member_userId_sketch_your_story_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_project" ADD CONSTRAINT "sketch_your_story_project_ownerId_sketch_your_story_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sketch_your_story_session" ADD CONSTRAINT "sketch_your_story_session_userId_sketch_your_story_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."sketch_your_story_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "sketch_your_story_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asset_project_idx" ON "sketch_your_story_asset" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_storage_key_idx" ON "sketch_your_story_asset" USING btree ("storageKey");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_token_hash_idx" ON "sketch_your_story_invitation" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "invitation_project_idx" ON "sketch_your_story_invitation" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "sketch_your_story_project_member" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_share_id_idx" ON "sketch_your_story_project" USING btree ("shareId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_public_slug_idx" ON "sketch_your_story_project" USING btree ("publicSlug");--> statement-breakpoint
CREATE INDEX "project_owner_updated_idx" ON "sketch_your_story_project" USING btree ("ownerId","updatedAt");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "sketch_your_story_session" USING btree ("userId");