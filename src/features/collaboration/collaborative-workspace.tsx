"use client";

import { LiveObject } from "@liveblocks/client";
import { useMemo } from "react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useHistory,
  useMutation,
  useOthers,
  useStatus,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { createEmptyStoryDocument } from "~/lib/story-document";
import {
  StoryWorkspace,
  getInitialWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "~/app/demo/story-workspace";

function RealtimeIndicator() {
  const status = useStatus();
  const others = useOthers();
  return (
    <div className={`realtime-indicator status-${status}`}>
      <i />
      {status === "connected"
        ? `${others.length ? `${others.length + 1} writers` : "Live"}`
        : status}
    </div>
  );
}

function RemoteCursors() {
  const others = useOthers();
  return (
    <>
      {others.map((other) =>
        other.presence.cursor ? (
          <div
            className="remote-cursor"
            key={other.connectionId}
            style={{
              left: other.presence.cursor.x,
              top: other.presence.cursor.y,
              background: other.info.color,
            }}
          >
            <span style={{ borderBottomColor: other.info.color }} />
            <b>{other.info.name}</b>
          </div>
        ) : null,
      )}
    </>
  );
}

function SyncedWorkspace(
  props: Omit<
    React.ComponentProps<typeof StoryWorkspace>,
    "initialSnapshot" | "onSnapshotChange"
  >,
) {
  const serialized = useStorage((root) => root.canvasSnapshot);
  const snapshot = useMemo(
    () => JSON.parse(serialized) as WorkspaceSnapshot,
    [serialized],
  );
  const save = useMutation(
    ({ storage }, next: WorkspaceSnapshot) =>
      storage.set("canvasSnapshot", JSON.stringify(next)),
    [],
  );
  const updatePresence = useUpdateMyPresence();
  const history = useHistory();
  return (
    <div
      className="collaborative-surface"
      onPointerMove={(event) =>
        updatePresence({ cursor: { x: event.clientX, y: event.clientY } })
      }
      onPointerLeave={() => updatePresence({ cursor: null })}
    >
      <StoryWorkspace
        {...props}
        initialSnapshot={snapshot}
        onSnapshotChange={save}
        onUndo={history.undo}
        onRedo={history.redo}
      />
      <RemoteCursors />
    </div>
  );
}

export function CollaborativeWorkspace({
  roomId,
  projectTitle,
  readOnly,
  projectId,
  shareId,
  publicSlug,
  visibility,
  canManage = false,
}: {
  roomId: string;
  projectTitle: string;
  readOnly: boolean;
  projectId?: string;
  shareId?: string;
  publicSlug?: string | null;
  visibility: "restricted" | "anyone_with_link" | "public";
  canManage?: boolean;
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, selection: [] }}
        initialStorage={{
          document: new LiveObject(createEmptyStoryDocument()),
          canvasSnapshot: JSON.stringify(getInitialWorkspaceSnapshot()),
        }}
      >
        <ClientSideSuspense
          fallback={
            <div className="workspace-loading">
              <span />
              <p>Opening your story…</p>
            </div>
          }
        >
          <SyncedWorkspace
            projectTitle={projectTitle}
            readOnly={readOnly}
            projectId={projectId}
            shareId={shareId}
            publicSlug={publicSlug}
            visibility={visibility}
            canManage={canManage}
          />
          <RealtimeIndicator />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
