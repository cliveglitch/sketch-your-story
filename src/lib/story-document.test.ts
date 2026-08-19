import { describe, expect, it } from "vitest";
import {
  canEdit,
  canView,
  remapStoryDocument,
  remapWorkspaceSnapshot,
  validateDocumentReferences,
  type StoryDocument,
} from "./story-document";

const document: StoryDocument = {
  schemaVersion: 1,
  entities: {
    c1: {
      id: "c1",
      kind: "character",
      name: "Mara",
      description: "",
      imageAssetId: null,
    },
    s1: {
      id: "s1",
      kind: "scene",
      title: "Arrival",
      synopsis: "",
      characterIds: ["c1"],
      status: "idea",
      storyTimeLabel: "",
    },
  },
  elements: {
    e1: {
      id: "e1",
      kind: "entity",
      entityId: "s1",
      text: "",
      title: "",
      position: { x: 0, y: 0 },
      size: { width: 220, height: 140 },
      color: "amber",
      parentId: null,
      zIndex: 1,
    },
  },
  edges: {},
  acts: [{ id: "a1", title: "Act I", sceneIds: ["s1"] }],
};

describe("story document", () => {
  it("validates a coherent graph", () =>
    expect(validateDocumentReferences(document)).toEqual([]));
  it("detects dangling references", () =>
    expect(
      validateDocumentReferences({
        ...document,
        acts: [{ id: "a1", title: "Act I", sceneIds: ["missing"] }],
      }),
    ).toContain("Act a1 references a missing scene"));
  it("remaps every linked id", () => {
    let i = 0;
    const imported = remapStoryDocument(document, () => `new-${++i}`);
    const scene = Object.values(imported.entities).find(
      (entity) => entity.kind === "scene",
    );
    expect(scene?.id).not.toBe("s1");
    expect(imported.acts[0]?.sceneIds[0]).toBe(scene?.id);
    expect(Object.values(imported.elements)[0]?.entityId).toBe(scene?.id);
  });
  it("enforces role and visibility semantics", () => {
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canView(null, "public")).toBe(true);
    expect(canView(null, "anyone_with_link", false)).toBe(false);
    expect(canView(null, "anyone_with_link", true)).toBe(true);
  });
  it("remaps portable workspace references", () => {
    let i = 0;
    const imported = remapWorkspaceSnapshot(
      {
        nodes: [
          { id: "group", data: {} },
          {
            id: "card",
            parentId: "group",
            data: { documentId: "document" },
          },
        ],
        edges: [{ id: "edge", source: "group", target: "card" }],
        acts: [
          {
            id: "act",
            scenes: [{ id: "scene", nodeId: "card", documentId: "document" }],
          },
        ],
        documents: [
          {
            id: "document",
            kind: "character",
            title: "Mara",
            body: "Mapmaker",
          },
        ],
        canvases: [
          {
            id: "canvas",
            title: "Plot map",
            nodes: [{ id: "placement", data: { documentId: "document" } }],
            edges: [],
          },
        ],
        activeCanvasId: "canvas",
      },
      () => `portable-${++i}`,
    );
    expect(imported.nodes[1]?.parentId).toBe(imported.nodes[0]?.id);
    expect(imported.edges[0]?.source).toBe(imported.nodes[0]?.id);
    expect(imported.edges[0]?.target).toBe(imported.nodes[1]?.id);
    expect(imported.acts[0]?.scenes[0]?.nodeId).toBe(imported.nodes[1]?.id);
    expect(imported.nodes[1]?.data.documentId).toBe(
      imported.documents?.[0]?.id,
    );
    expect(imported.canvases?.[0]?.nodes[0]?.data.documentId).toBe(
      imported.documents?.[0]?.id,
    );
    expect(imported.activeCanvasId).toBe(imported.canvases?.[0]?.id);
  });
});
