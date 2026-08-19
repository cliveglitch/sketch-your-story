import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getProjectAccess } from "~/server/project-access";

export async function POST(request: Request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret)
    return NextResponse.json(
      { error: "Realtime collaboration is not configured." },
      { status: 503 },
    );
  const payload = (await request.json()) as { room?: string };
  const roomId = payload.room;
  if (!roomId?.startsWith("project:"))
    return NextResponse.json({ error: "Invalid room." }, { status: 400 });
  const projectId = roomId.slice("project:".length);
  const session = await auth();
  const access = await getProjectAccess(db, projectId, session?.user?.id);
  if (!access)
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const canReadAnonymously =
    access.project.visibility === "public" ||
    access.project.visibility === "anyone_with_link";
  if (!access.role && !canReadAnonymously)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const liveblocks = new Liveblocks({ secret });
  const userId = session?.user?.id ?? `guest:${crypto.randomUUID()}`;
  const roomSession = liveblocks.prepareSession(userId, {
    userInfo: {
      name: session?.user?.name ?? "Guest reader",
      avatar: session?.user?.image ?? "",
      color:
        access.role === "owner"
          ? "#8f86ff"
          : access.role === "editor"
            ? "#59a083"
            : "#6f9fcc",
    },
  });
  roomSession.allow(
    roomId,
    access.role === "owner" || access.role === "editor"
      ? roomSession.FULL_ACCESS
      : roomSession.READ_ACCESS,
  );
  const { status, body } = await roomSession.authorize();
  return new Response(body, { status });
}
