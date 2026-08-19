import { z } from "zod";

const id = z.string().min(1).max(255);
const color = z.enum(["violet", "blue", "amber", "green", "rose", "neutral"]);
const point = z.object({ x: z.number().finite(), y: z.number().finite() });

export const characterEntitySchema = z.object({
  id,
  kind: z.literal("character"),
  name: z.string().min(1).max(120),
  description: z.string().max(20_000).default(""),
  imageAssetId: id.nullable().default(null),
});
export const sceneEntitySchema = z.object({
  id,
  kind: z.literal("scene"),
  title: z.string().min(1).max(120),
  synopsis: z.string().max(20_000).default(""),
  characterIds: z.array(id).default([]),
  status: z.enum(["idea", "outlined", "drafting", "revised"]).default("idea"),
  storyTimeLabel: z.string().max(120).default(""),
});
export const noteEntitySchema = z.object({
  id,
  kind: z.literal("note"),
  title: z.string().min(1).max(120),
  body: z.string().max(20_000).default(""),
});
export const storyEntitySchema = z.discriminatedUnion("kind", [
  characterEntitySchema,
  sceneEntitySchema,
  noteEntitySchema,
]);

export const canvasElementSchema = z.object({
  id,
  kind: z.enum(["entity", "text", "group"]),
  entityId: id.nullable().default(null),
  text: z.string().max(20_000).default(""),
  title: z.string().max(120).default(""),
  position: point,
  size: z.object({
    width: z.number().min(80).max(10_000),
    height: z.number().min(40).max(10_000),
  }),
  color: color.default("neutral"),
  parentId: id.nullable().default(null),
  zIndex: z.number().int().default(0),
});
export const storyEdgeSchema = z.object({
  id,
  sourceId: id,
  targetId: id,
  sourceHandle: z.string().nullable().default(null),
  targetHandle: z.string().nullable().default(null),
  direction: z.enum(["none", "forward", "reverse", "both"]).default("forward"),
  label: z.string().max(240).default(""),
  color: color.default("neutral"),
});
export const actSchema = z.object({
  id,
  title: z.string().min(1).max(120),
  sceneIds: z.array(id),
});

export const storyDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  entities: z.record(id, storyEntitySchema),
  elements: z.record(id, canvasElementSchema),
  edges: z.record(id, storyEdgeSchema),
  acts: z.array(actSchema),
});

const workspaceNodeSchema = z
  .object({
    id,
    parentId: id.optional(),
    data: z
      .object({
        documentId: id.optional(),
      })
      .passthrough()
      .default({}),
  })
  .passthrough();
const workspaceEdgeSchema = z
  .object({
    id,
    source: id,
    target: id,
  })
  .passthrough();
const workspaceActSchema = z
  .object({
    id,
    scenes: z.array(
      z
        .object({
          id,
          nodeId: id.optional(),
          documentId: id.optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
const workspaceDocumentSchema = z
  .object({
    id,
    kind: z.enum(["note", "character", "scene"]),
    title: z.string().max(120),
    body: z.string().max(100_000),
  })
  .passthrough();
const workspaceCanvasSchema = z
  .object({
    id,
    title: z.string().min(1).max(120),
    nodes: z.array(workspaceNodeSchema),
    edges: z.array(workspaceEdgeSchema),
  })
  .passthrough();

export const workspaceSnapshotSchema = z
  .object({
    nodes: z.array(workspaceNodeSchema),
    edges: z.array(workspaceEdgeSchema),
    acts: z.array(workspaceActSchema),
    documents: z.array(workspaceDocumentSchema).optional(),
    canvases: z.array(workspaceCanvasSchema).optional(),
    activeCanvasId: id.optional(),
  })
  .passthrough();

export const archiveManifestSchema = z.object({
  format: z.literal("sketch-your-story"),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string(),
  exportedAt: z.string().datetime(),
});
export const archiveAssetSchema = z.object({
  id,
  filename: z.string().min(1).max(512),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  path: z.string().min(1).max(1024),
});
export const archiveProjectSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(5_000).default(""),
  document: storyDocumentSchema,
  canvasSnapshot: workspaceSnapshotSchema,
  assets: z.array(archiveAssetSchema).default([]),
});

export type StoryDocument = z.infer<typeof storyDocumentSchema>;
export type StoryEntity = z.infer<typeof storyEntitySchema>;
export type CanvasElement = z.infer<typeof canvasElementSchema>;
export type StoryEdge = z.infer<typeof storyEdgeSchema>;
export type WorkspaceArchiveSnapshot = z.infer<typeof workspaceSnapshotSchema>;
export type ProjectRole = "owner" | "editor" | "viewer";
export type ProjectVisibility = "restricted" | "anyone_with_link" | "public";

export function createEmptyStoryDocument(): StoryDocument {
  return {
    schemaVersion: 1,
    entities: {},
    elements: {},
    edges: {},
    acts: [{ id: crypto.randomUUID(), title: "Act I", sceneIds: [] }],
  };
}

export function validateDocumentReferences(document: StoryDocument): string[] {
  const errors: string[] = [];
  const entityIds = new Set(Object.keys(document.entities));
  const elementIds = new Set(Object.keys(document.elements));
  const sceneIds = new Set(
    Object.values(document.entities)
      .filter((entity) => entity.kind === "scene")
      .map((entity) => entity.id),
  );
  const placedScenes = new Set<string>();
  for (const element of Object.values(document.elements)) {
    if (
      element.kind === "entity" &&
      (!element.entityId || !entityIds.has(element.entityId))
    )
      errors.push(`Element ${element.id} has a dangling entity reference`);
    if (
      element.parentId &&
      (!elementIds.has(element.parentId) ||
        document.elements[element.parentId]?.kind !== "group")
    )
      errors.push(`Element ${element.id} has an invalid parent group`);
  }
  for (const edge of Object.values(document.edges))
    if (!elementIds.has(edge.sourceId) || !elementIds.has(edge.targetId))
      errors.push(`Edge ${edge.id} has a dangling endpoint`);
  for (const act of document.acts)
    for (const sceneId of act.sceneIds) {
      if (!sceneIds.has(sceneId))
        errors.push(`Act ${act.id} references a missing scene`);
      if (placedScenes.has(sceneId))
        errors.push(`Scene ${sceneId} appears more than once in the timeline`);
      placedScenes.add(sceneId);
    }
  for (const entity of Object.values(document.entities))
    if (entity.kind === "scene")
      for (const characterId of entity.characterIds)
        if (document.entities[characterId]?.kind !== "character")
          errors.push(`Scene ${entity.id} references a missing character`);
  return errors;
}

export function migrateStoryDocument(input: unknown): StoryDocument {
  const version = z
    .object({ schemaVersion: z.number().int() })
    .parse(input).schemaVersion;
  if (version > 1)
    throw new Error(`This project uses unsupported schema version ${version}`);
  if (version < 1)
    throw new Error(`No migration exists for schema version ${version}`);
  const document = storyDocumentSchema.parse(input);
  const referenceErrors = validateDocumentReferences(document);
  if (referenceErrors.length) throw new Error(referenceErrors.join("; "));
  return document;
}

export function remapStoryDocument(
  document: StoryDocument,
  makeId: () => string = () => crypto.randomUUID(),
): StoryDocument {
  const entityMap = new Map(
    Object.keys(document.entities).map((oldId) => [oldId, makeId()]),
  );
  const elementMap = new Map(
    Object.keys(document.elements).map((oldId) => [oldId, makeId()]),
  );
  const actMap = new Map(document.acts.map((act) => [act.id, makeId()]));
  const entities = Object.fromEntries(
    Object.values(document.entities).map((entity) => {
      const nextId = entityMap.get(entity.id)!;
      return [
        nextId,
        entity.kind === "scene"
          ? {
              ...entity,
              id: nextId,
              characterIds: entity.characterIds.map(
                (value) => entityMap.get(value) ?? value,
              ),
            }
          : { ...entity, id: nextId },
      ];
    }),
  );
  const elements = Object.fromEntries(
    Object.values(document.elements).map((element) => {
      const nextId = elementMap.get(element.id)!;
      return [
        nextId,
        {
          ...element,
          id: nextId,
          entityId: element.entityId
            ? (entityMap.get(element.entityId) ?? element.entityId)
            : null,
          parentId: element.parentId
            ? (elementMap.get(element.parentId) ?? element.parentId)
            : null,
        },
      ];
    }),
  );
  const edges = Object.fromEntries(
    Object.values(document.edges).map((edge) => {
      const nextId = makeId();
      return [
        nextId,
        {
          ...edge,
          id: nextId,
          sourceId: elementMap.get(edge.sourceId) ?? edge.sourceId,
          targetId: elementMap.get(edge.targetId) ?? edge.targetId,
        },
      ];
    }),
  );
  const acts = document.acts.map((act) => ({
    ...act,
    id: actMap.get(act.id)!,
    sceneIds: act.sceneIds.map((value) => entityMap.get(value) ?? value),
  }));
  return { schemaVersion: 1, entities, elements, edges, acts };
}

export function remapWorkspaceSnapshot(
  snapshot: WorkspaceArchiveSnapshot,
  makeId: () => string = () => crypto.randomUUID(),
): WorkspaceArchiveSnapshot {
  const documentMap = new Map(
    (snapshot.documents ?? []).map((document) => [document.id, makeId()]),
  );
  const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
  if (nodeIds.size !== snapshot.nodes.length)
    throw new Error("The workspace contains duplicate node IDs");
  for (const node of snapshot.nodes)
    if (node.parentId && !nodeIds.has(node.parentId))
      throw new Error(`Node ${node.id} has an invalid parent`);
  for (const edge of snapshot.edges) {
    if (!nodeIds.has(edge.source))
      throw new Error(`Edge ${edge.id} has a dangling source`);
    if (!nodeIds.has(edge.target))
      throw new Error(`Edge ${edge.id} has a dangling target`);
  }
  const nodeMap = new Map(snapshot.nodes.map((node) => [node.id, makeId()]));
  const actMap = new Map(snapshot.acts.map((act) => [act.id, makeId()]));
  const nodes = snapshot.nodes.map((node) => ({
    ...node,
    id: nodeMap.get(node.id)!,
    data: {
      ...node.data,
      ...(node.data.documentId
        ? {
            documentId:
              documentMap.get(node.data.documentId) ?? node.data.documentId,
          }
        : {}),
    },
    ...(node.parentId
      ? { parentId: nodeMap.get(node.parentId) ?? node.parentId }
      : {}),
  }));
  const edges = snapshot.edges.map((edge) => ({
    ...edge,
    id: makeId(),
    source: nodeMap.get(edge.source) ?? edge.source,
    target: nodeMap.get(edge.target) ?? edge.target,
  }));
  const acts = snapshot.acts.map((act) => ({
    ...act,
    id: actMap.get(act.id)!,
    scenes: act.scenes.map((scene) => ({
      ...scene,
      id: makeId(),
      ...(scene.documentId
        ? {
            documentId: documentMap.get(scene.documentId) ?? scene.documentId,
          }
        : {}),
      ...(scene.nodeId
        ? { nodeId: nodeMap.get(scene.nodeId) ?? scene.nodeId }
        : {}),
    })),
  }));
  const documents = snapshot.documents?.map((document) => ({
    ...document,
    id: documentMap.get(document.id)!,
  }));
  const canvasMap = new Map(
    (snapshot.canvases ?? []).map((canvas) => [canvas.id, makeId()]),
  );
  const canvases = snapshot.canvases?.map((canvas) => {
    const canvasNodeMap = new Map(
      canvas.nodes.map((node) => [node.id, makeId()]),
    );
    return {
      ...canvas,
      id: canvasMap.get(canvas.id)!,
      nodes: canvas.nodes.map((node) => ({
        ...node,
        id: canvasNodeMap.get(node.id)!,
        data: {
          ...node.data,
          ...(node.data.documentId
            ? {
                documentId:
                  documentMap.get(node.data.documentId) ?? node.data.documentId,
              }
            : {}),
        },
        ...(node.parentId
          ? {
              parentId: canvasNodeMap.get(node.parentId) ?? node.parentId,
            }
          : {}),
      })),
      edges: canvas.edges.map((edge) => ({
        ...edge,
        id: makeId(),
        source: canvasNodeMap.get(edge.source) ?? edge.source,
        target: canvasNodeMap.get(edge.target) ?? edge.target,
      })),
    };
  });
  return {
    ...snapshot,
    nodes,
    edges,
    acts,
    ...(documents ? { documents } : {}),
    ...(canvases ? { canvases } : {}),
    ...(snapshot.activeCanvasId
      ? {
          activeCanvasId:
            canvasMap.get(snapshot.activeCanvasId) ?? snapshot.activeCanvasId,
        }
      : {}),
  };
}

export function canEdit(role: ProjectRole | null): boolean {
  return role === "owner" || role === "editor";
}
export function canManage(role: ProjectRole | null): boolean {
  return role === "owner";
}
export function canView(
  role: ProjectRole | null,
  visibility: ProjectVisibility,
  hasShareId = false,
): boolean {
  return (
    role !== null ||
    visibility === "public" ||
    (visibility === "anyone_with_link" && hasShareId)
  );
}
