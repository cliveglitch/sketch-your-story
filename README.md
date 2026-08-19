# Sketch Your Story

A collaborative visual studio for writers to map characters, scenes, relationships, and story timelines before drafting.

## What is included

- Obsidian-style React Flow canvas with notes, character and scene cards, raw text, groups, resizable elements, labeled directional connections, minimap, and keyboard deletion.
- Act-and-scene timeline with drag-and-drop movement between acts, plus a character index and shared inspector.
- Liveblocks-backed persistent canvas state, presence, cursors, reconnection status, history, and server-derived owner/editor/viewer room permissions.
- Auth.js GitHub sign-in, private project dashboard, public and anyone-with-link reader routes, existing-user grants, and hashed single-use invitation links.
- UploadThing character portraits with server-side project authorization.
- Versioned `.sketchstory.zip` import/export with bundled images, MIME verification, reference validation, ID remapping, rollback cleanup, and a 100 MB archive limit.
- Drizzle/Neon schema and initial migration for Auth.js, projects, memberships, invitations, and assets.

The service-free interactive product tour is available at `/demo`.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and configure:
   - GitHub OAuth: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_SECRET`.
   - Neon: `DATABASE_URL`.
   - Liveblocks: `LIVEBLOCKS_SECRET_KEY`.
   - UploadThing: `UPLOADTHING_TOKEN`.
   - `NEXT_PUBLIC_APP_URL` for OAuth callbacks and share links.
3. Apply the database migration with `pnpm db:migrate`.
4. Start the app with `pnpm dev`.

GitHub OAuth callback URLs should use `/api/auth/callback/github` on each local or deployed origin.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Deployment

Create the Neon, Liveblocks, UploadThing, and GitHub OAuth resources, add the environment variables to Vercel, run the checked-in Drizzle migration against the production database, and deploy the repository as a Next.js application. Use the final Vercel origin for `NEXT_PUBLIC_APP_URL` and the production GitHub OAuth callback.
