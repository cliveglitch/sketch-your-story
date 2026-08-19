import type { Metadata } from "next";
import { StoryWorkspace } from "./story-workspace";

export const metadata: Metadata = { title: "The Glass Orchard" };

export default function DemoPage() {
  return <StoryWorkspace />;
}
