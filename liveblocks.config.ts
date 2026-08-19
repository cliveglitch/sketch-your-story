import type { LiveObject } from "@liveblocks/client";
import type { StoryDocument } from "~/lib/story-document";

declare global {
  interface Liveblocks {
    Presence: { cursor: { x: number; y: number } | null; selection: string[] };
    Storage: { document: LiveObject<StoryDocument>; canvasSnapshot: string };
    UserMeta: {
      id: string;
      info: { name: string; avatar: string; color: string };
    };
  }
}

export {};
