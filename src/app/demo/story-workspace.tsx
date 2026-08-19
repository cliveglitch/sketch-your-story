"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Feather,
  FileText,
  FileDown,
  GitBranch,
  GripVertical,
  ImagePlus,
  LayoutDashboard,
  Map,
  MoreHorizontal,
  MousePointer2,
  PanelsTopLeft,
  Plus,
  Redo2,
  Search,
  Share2,
  Sparkles,
  StickyNote,
  Type,
  Undo2,
  Users,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { WikiNoteEditor } from "~/features/editor/wiki-note-editor";
import { ShareDialog } from "~/features/sharing/share-dialog";
import { PortraitUploader } from "~/features/uploads/portrait-uploader";
import type { ProjectVisibility } from "~/lib/story-document";
import {
  STORY_DOCUMENT_DRAG_TYPE,
  renameWikiLinks,
  uniqueDocumentTitle,
} from "~/lib/wiki-links";

type StoryKind = "note" | "character" | "scene" | "text" | "group";
type StoryData = Record<string, unknown> & {
  kind: StoryKind;
  title: string;
  body?: string;
  color?: string;
  kicker?: string;
  avatar?: string;
  imageUrl?: string;
  imageAssetId?: string;
  documentId?: string;
};
type StoryNode = Node<StoryData>;
type ProjectDocument = {
  id: string;
  kind: "note" | "character" | "scene";
  title: string;
  body: string;
  color: string;
  kicker: string;
  avatar?: string;
  imageUrl?: string;
  imageAssetId?: string;
  status?: string;
  storyTime?: string;
};
type StoryCanvas = {
  id: string;
  title: string;
  nodes: StoryNode[];
  edges: Edge[];
};
type WorkspaceContextMenu =
  | { kind: "pane"; x: number; y: number; position: XYPosition }
  | { kind: "node"; x: number; y: number; nodeId: string }
  | { kind: "document"; x: number; y: number; documentId: string };

const DARK_EDGE_LABEL = {
  labelBgStyle: { fill: "#17161c", fillOpacity: 0.98 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 4,
  labelStyle: { fill: "#c4bdce", fontSize: 11 },
};

const initialNodes: StoryNode[] = [
  {
    id: "group-origin",
    type: "storyGroup",
    position: { x: -70, y: -90 },
    data: { kind: "group", title: "The disappearance", color: "violet" },
    style: { width: 650, height: 360 },
    zIndex: -1,
  },
  {
    id: "mara",
    type: "storyCard",
    position: { x: 35, y: 35 },
    parentId: "group-origin",
    extent: "parent",
    data: {
      kind: "character",
      kicker: "PROTAGONIST",
      title: "Mara Vale",
      body: "A mapmaker who can chart memories—but never her own.",
      color: "violet",
      avatar: "MV",
      documentId: "doc-mara",
    },
  },
  {
    id: "orchard",
    type: "storyCard",
    position: { x: 350, y: 38 },
    parentId: "group-origin",
    extent: "parent",
    data: {
      kind: "scene",
      kicker: "SCENE 07 · ACT II",
      title: "The orchard remembers",
      body: "The glass trees replay a childhood Mara is certain she never lived.",
      color: "amber",
      documentId: "doc-orchard",
    },
  },
  {
    id: "cost",
    type: "storyCard",
    position: { x: 165, y: 210 },
    parentId: "group-origin",
    extent: "parent",
    data: {
      kind: "note",
      kicker: "THEME",
      title: "The cost of memory",
      body: "Every recovered memory quietly replaces a true one.",
      color: "blue",
      documentId: "doc-cost",
    },
  },
  {
    id: "ilya",
    type: "storyCard",
    position: { x: 715, y: 35 },
    data: {
      kind: "character",
      kicker: "ALLY?",
      title: "Ilya Voss",
      body: "Keeper of the orchard and an unreliable witness.",
      color: "green",
      avatar: "IV",
      documentId: "doc-ilya",
    },
  },
  {
    id: "question",
    type: "rawText",
    position: { x: 680, y: 270 },
    data: {
      kind: "text",
      title: "What does Ilya remember\nthat Mara chose to forget?",
    },
  },
];

const initialEdges: Edge[] = [
  {
    ...DARK_EDGE_LABEL,
    id: "mara-orchard",
    source: "mara",
    target: "orchard",
    label: "enters",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#8f86ff", strokeWidth: 1.5 },
    labelStyle: { fill: "#aaa4bd", fontSize: 11 },
  },
  {
    ...DARK_EDGE_LABEL,
    id: "orchard-cost",
    source: "orchard",
    target: "cost",
    label: "reveals",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#d8a456", strokeWidth: 1.5 },
    labelStyle: { fill: "#aaa4bd", fontSize: 11 },
  },
  {
    ...DARK_EDGE_LABEL,
    id: "ilya-orchard",
    source: "ilya",
    target: "orchard",
    label: "protects → betrays",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#56a98d", strokeWidth: 1.5 },
    labelStyle: { fill: "#aaa4bd", fontSize: 11 },
  },
];

function StoryCard({ data, selected }: NodeProps<StoryNode>) {
  return (
    <article
      className={`story-node tone-${data.color ?? "violet"} ${selected ? "selected" : ""}`}
    >
      <NodeResizer
        minWidth={220}
        minHeight={120}
        isVisible={selected}
        lineClassName="node-resize-line"
        handleClassName="node-resize-handle"
      />
      <Handle type="target" position={Position.Left} />
      <div className="node-heading">
        {data.imageUrl ? (
          <span className="node-avatar">
            <Image
              src={data.imageUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
            />
          </span>
        ) : data.avatar ? (
          <span className="node-avatar">{data.avatar}</span>
        ) : null}
        <div>
          <small>{data.kicker}</small>
          <h3>{data.title}</h3>
        </div>
      </div>
      <p>{data.body}</p>
      <Handle type="source" position={Position.Right} />
    </article>
  );
}

function StoryGroup({ data, selected }: NodeProps<StoryNode>) {
  return (
    <section
      className={`story-group tone-${data.color ?? "violet"} ${selected ? "selected" : ""}`}
    >
      <NodeResizer minWidth={360} minHeight={260} isVisible={selected} />
      <span>{data.title}</span>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </section>
  );
}

function RawText({ data }: NodeProps<StoryNode>) {
  return (
    <div className="raw-text-node">
      <Handle type="target" position={Position.Left} />
      <p>{data.title}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  storyCard: StoryCard,
  storyGroup: StoryGroup,
  rawText: RawText,
};

type EdgeDirection = "none" | "forward" | "reverse" | "both";
function EdgeInspector({
  edge,
  readOnly,
  onChange,
}: {
  edge: Edge;
  readOnly: boolean;
  onChange: (patch: Partial<Edge>) => void;
}) {
  const direction =
    (edge.data?.direction as EdgeDirection | undefined) ?? "forward";
  const setDirection = (next: EdgeDirection) =>
    onChange({
      data: { ...edge.data, direction: next },
      markerStart:
        next === "reverse" || next === "both"
          ? { type: MarkerType.ArrowClosed }
          : undefined,
      markerEnd:
        next === "forward" || next === "both"
          ? { type: MarkerType.ArrowClosed }
          : undefined,
    });
  return (
    <>
      <div className="inspector-heading">
        <div>
          <small>CONNECTION</small>
          <h2>
            {typeof edge.label === "string" && edge.label
              ? edge.label
              : "Untitled relationship"}
          </h2>
        </div>
      </div>
      <div className="inspector-section">
        <label>Label</label>
        <input
          disabled={readOnly}
          value={typeof edge.label === "string" ? edge.label : ""}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder="e.g. protects, reveals, opposes"
        />
      </div>
      <div className="inspector-section">
        <label>Direction</label>
        <select
          className="direction-select"
          disabled={readOnly}
          value={direction}
          onChange={(event) =>
            setDirection(event.target.value as EdgeDirection)
          }
        >
          <option value="none">No arrow</option>
          <option value="forward">Source → target</option>
          <option value="reverse">Source ← target</option>
          <option value="both">Both directions</option>
        </select>
      </div>
      <div className="inspector-meta">
        <span>Connects two story elements</span>
        <span>{readOnly ? "Viewing" : "Live"}</span>
      </div>
    </>
  );
}

type TimelineScene = {
  id: string;
  documentId: string;
  kind: ProjectDocument["kind"];
  title: string;
  synopsis: string;
  status: string;
  time: string;
  nodeId?: string;
};
type TimelineAct = { id: string; title: string; scenes: TimelineScene[] };
const initialActs: TimelineAct[] = [
  {
    id: "act-1",
    title: "Act I · The map",
    scenes: [
      {
        id: "scene-1",
        documentId: "doc-city-disappears",
        kind: "scene",
        title: "A city disappears",
        synopsis: "Mara discovers a blank district on every map but her own.",
        status: "Outlined",
        time: "Day 1",
      },
      {
        id: "scene-2",
        documentId: "doc-commission",
        kind: "scene",
        title: "The impossible commission",
        synopsis: "A stranger asks Mara to chart a childhood memory.",
        status: "Idea",
        time: "Night 1",
      },
    ],
  },
  {
    id: "act-2",
    title: "Act II · The orchard",
    scenes: [
      {
        id: "scene-7",
        documentId: "doc-orchard",
        kind: "scene",
        nodeId: "orchard",
        title: "The orchard remembers",
        synopsis:
          "The glass trees replay a childhood Mara is certain she never lived.",
        status: "Drafting",
        time: "Day 4",
      },
      {
        id: "scene-8",
        documentId: "doc-ilya-story",
        kind: "scene",
        title: "Ilya's second story",
        synopsis: "The keeper changes one crucial detail.",
        status: "Idea",
        time: "Dusk",
      },
    ],
  },
  {
    id: "act-3",
    title: "Act III · The choice",
    scenes: [
      {
        id: "scene-12",
        documentId: "doc-map-burns",
        kind: "scene",
        title: "The map burns backward",
        synopsis: "Mara chooses which version of the city gets to survive.",
        status: "Idea",
        time: "Day 7",
      },
    ],
  },
];

const initialDocuments: ProjectDocument[] = [
  {
    id: "doc-mara",
    kind: "character",
    title: "Mara Vale",
    body: "A mapmaker who can chart memories—but never her own.\n\nMara keeps a private atlas of places that everyone else has forgotten. She trusts maps more than testimony, including her own.",
    color: "violet",
    kicker: "PROTAGONIST",
    avatar: "MV",
  },
  {
    id: "doc-ilya",
    kind: "character",
    title: "Ilya Voss",
    body: "Keeper of the orchard and an unreliable witness.\n\nIlya knows why the glass trees remember Mara, but every version of the truth protects someone different.",
    color: "green",
    kicker: "ALLY?",
    avatar: "IV",
  },
  {
    id: "doc-orchard",
    kind: "scene",
    title: "The orchard remembers",
    body: "The glass trees replay a childhood Mara is certain she never lived.\n\nThe scene begins in silence. Each tree holds one moving memory beneath its bark, and all of them turn toward Mara when she enters.",
    color: "amber",
    kicker: "SCENE 07 · ACT II",
    status: "Drafting",
    storyTime: "Day 4",
  },
  {
    id: "doc-cost",
    kind: "note",
    title: "The cost of memory",
    body: "Every recovered memory quietly replaces a true one.\n\nThis is the central thematic rule. Recovery is never restoration; it is an exchange.",
    color: "blue",
    kicker: "THEME",
  },
  ...initialActs.flatMap((act) =>
    act.scenes
      .filter((scene) => scene.documentId !== "doc-orchard")
      .map((scene) => ({
        id: scene.documentId,
        kind: scene.kind,
        title: scene.title,
        body: scene.synopsis,
        color: "amber",
        kicker: "SCENE",
        status: scene.status,
        storyTime: scene.time,
      })),
  ),
];

const initialCanvases: StoryCanvas[] = [
  {
    id: "canvas-plot",
    title: "Plot map",
    nodes: initialNodes,
    edges: initialEdges,
  },
  {
    id: "canvas-relationships",
    title: "Character relationships",
    nodes: [
      {
        ...initialNodes[1]!,
        id: "relationship-mara",
        parentId: undefined,
        extent: undefined,
        position: { x: 120, y: 150 },
      },
      {
        ...initialNodes[4]!,
        id: "relationship-ilya",
        position: { x: 600, y: 150 },
      },
    ],
    edges: [
      {
        ...DARK_EDGE_LABEL,
        id: "relationship-edge",
        source: "relationship-mara",
        target: "relationship-ilya",
        label: "needs → distrusts",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#8f86ff", strokeWidth: 1.5 },
      },
    ],
  },
];

export type WorkspaceSnapshot = {
  nodes: StoryNode[];
  edges: Edge[];
  acts: TimelineAct[];
  documents?: ProjectDocument[];
  canvases?: StoryCanvas[];
  activeCanvasId?: string;
};
export function getInitialWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    nodes: initialNodes,
    edges: initialEdges,
    acts: initialActs,
    documents: initialDocuments,
    canvases: initialCanvases,
    activeCanvasId: "canvas-plot",
  };
}

function TimelineBoard({
  acts,
  setActs,
  readOnly,
  onSelect,
  onCreateScene,
}: {
  acts: TimelineAct[];
  setActs: React.Dispatch<React.SetStateAction<TimelineAct[]>>;
  readOnly: boolean;
  onSelect: (documentId: string, nodeId?: string) => void;
  onCreateScene: () => void;
}) {
  const [dragged, setDragged] = useState<{
    actId: string;
    sceneId: string;
  } | null>(null);
  const moveScene = (targetActId: string) => {
    if (!dragged || readOnly) return;
    setActs((items) => {
      const scene = items
        .find((act) => act.id === dragged.actId)
        ?.scenes.find((item) => item.id === dragged.sceneId);
      if (!scene || dragged.actId === targetActId) return items;
      return items.map((act) =>
        act.id === dragged.actId
          ? {
              ...act,
              scenes: act.scenes.filter((item) => item.id !== dragged.sceneId),
            }
          : act.id === targetActId
            ? { ...act, scenes: [...act.scenes, scene] }
            : act,
      );
    });
    setDragged(null);
  };
  return (
    <section className="timeline-stage">
      <header>
        <div>
          <p className="eyebrow">SCENE TIMELINE</p>
          <h2>Follow the story&apos;s pulse.</h2>
        </div>
        <div className="timeline-legend">
          <span>
            <i className="idea" />
            Idea
          </span>
          <span>
            <i className="outlined" />
            Outlined
          </span>
          <span>
            <i className="drafting" />
            Drafting
          </span>
        </div>
      </header>
      <div className="acts-row">
        {acts.map((act, actIndex) => (
          <article
            className="act-column"
            key={act.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveScene(act.id)}
          >
            <div className="act-heading">
              <div>
                <small>ACT {actIndex + 1}</small>
                <strong>{act.title.replace(/^Act [IVX]+ · /, "")}</strong>
              </div>
              <span>{act.scenes.length} notes</span>
            </div>
            <div className="scene-stack">
              {act.scenes.map((scene, index) => (
                <button
                  draggable={!readOnly}
                  onDragStart={() =>
                    setDragged({ actId: act.id, sceneId: scene.id })
                  }
                  onClick={() => onSelect(scene.documentId, scene.nodeId)}
                  className="timeline-scene"
                  key={scene.id}
                >
                  <GripVertical size={13} />
                  <div>
                    <small>
                      {scene.kind.toUpperCase()}{" "}
                      {String(index + 1).padStart(2, "0")} · {scene.time}
                    </small>
                    <strong>{scene.title}</strong>
                    <p>{scene.synopsis}</p>
                    <span
                      className={`scene-status ${scene.status.toLowerCase()}`}
                    >
                      <i />
                      {scene.status}
                    </span>
                  </div>
                  <MoreHorizontal size={14} />
                </button>
              ))}
            </div>
            {!readOnly ? (
              <button className="add-scene" onClick={onCreateScene}>
                <Plus size={13} />
                Add note
              </button>
            ) : null}
          </article>
        ))}
        {!readOnly ? (
          <button
            className="add-act"
            onClick={() =>
              setActs((items) => [
                ...items,
                {
                  id: crypto.randomUUID(),
                  title: `Act ${items.length + 1} · Untitled`,
                  scenes: [],
                },
              ])
            }
          >
            <Plus size={18} />
            <span>Add an act</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

function CharacterIndex({
  documents,
  onSelect,
}: {
  documents: ProjectDocument[];
  onSelect: (id: string) => void;
}) {
  const characters = documents.filter(
    (document) => document.kind === "character",
  );
  return (
    <section className="character-stage">
      <header>
        <div>
          <p className="eyebrow">CHARACTER INDEX</p>
          <h2>Everyone who carries the story.</h2>
        </div>
        <span>
          <CheckCircle2 size={14} />
          {characters.length} developed characters
        </span>
      </header>
      <div className="character-grid">
        {characters.map((character) => (
          <button key={character.id} onClick={() => onSelect(character.id)}>
            <span className={`character-avatar tone-${character.color}`}>
              {character.avatar ?? character.title.slice(0, 2).toUpperCase()}
            </span>
            <small>{character.kicker}</small>
            <h3>{character.title}</h3>
            <p>{character.body}</p>
            <i>Open profile →</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function DocumentEditor({
  document,
  readOnly,
  onClose,
  onChange,
  onPlaceCanvas,
  onPlaceTimeline,
  documents,
  onOpenDocument,
}: {
  document: ProjectDocument;
  readOnly: boolean;
  onClose: () => void;
  onChange: (patch: Partial<ProjectDocument>) => void;
  onPlaceCanvas: () => void;
  onPlaceTimeline: () => void;
  documents: ProjectDocument[];
  onOpenDocument: (documentId: string) => void;
}) {
  return (
    <section className="document-editor">
      <div className="document-editor-toolbar">
        <button onClick={onClose}>
          <ArrowLeft size={15} /> Back to workspace
        </button>
        <span>{document.kind.toUpperCase()} NOTE</span>
        {!readOnly ? (
          <div>
            <button onClick={onPlaceCanvas}>
              <Map size={14} /> Place on canvas
            </button>
            <button onClick={onPlaceTimeline}>
              <Clock3 size={14} /> Add to timeline
            </button>
          </div>
        ) : null}
      </div>
      <article className="document-page">
        <div className={`document-mark tone-${document.color}`}>
          {document.kind === "character"
            ? (document.avatar ?? document.title.slice(0, 2).toUpperCase())
            : document.kind === "scene"
              ? "SC"
              : "NT"}
        </div>
        <input
          className="document-kicker"
          aria-label="Document label"
          disabled={readOnly}
          value={document.kicker}
          onChange={(event) => onChange({ kicker: event.target.value })}
        />
        <textarea
          className="document-title"
          aria-label="Document title"
          disabled={readOnly}
          rows={1}
          value={document.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <div className="document-rule" />
        <WikiNoteEditor
          value={document.body}
          documents={documents}
          readOnly={readOnly}
          onChange={(body) => onChange({ body })}
          onOpenDocument={onOpenDocument}
        />
      </article>
      <footer>
        <span>Plain text · saved automatically</span>
        <span>
          {document.body.trim().split(/\s+/).filter(Boolean).length} words
        </span>
      </footer>
    </section>
  );
}

function ContextMenu({
  menu,
  children,
}: {
  menu: WorkspaceContextMenu;
  children: React.ReactNode;
}) {
  const width = 210;
  const estimatedHeight = menu.kind === "pane" ? 224 : 196;
  const left = Math.min(menu.x, window.innerWidth - width - 10);
  const top = Math.min(menu.y, window.innerHeight - estimatedHeight - 10);
  return (
    <div
      className="workspace-context-menu"
      role="menu"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function StoryWorkspace({
  projectTitle = "The Glass Orchard",
  readOnly = false,
  projectId,
  shareId,
  publicSlug,
  visibility = "restricted",
  canManage = false,
  initialSnapshot,
  onSnapshotChange,
  onUndo,
  onRedo,
}: {
  projectTitle?: string;
  readOnly?: boolean;
  projectId?: string;
  shareId?: string;
  publicSlug?: string | null;
  visibility?: ProjectVisibility;
  canManage?: boolean;
  initialSnapshot?: WorkspaceSnapshot;
  onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const seed = initialSnapshot ?? getInitialWorkspaceSnapshot();
  const seedCanvases = seed.canvases ?? [
    {
      id: "canvas-plot",
      title: "Plot map",
      nodes: seed.nodes,
      edges: seed.edges,
    },
  ];
  const seedCanvas =
    seedCanvases.find((canvas) => canvas.id === seed.activeCanvasId) ??
    seedCanvases[0]!;
  const [nodes, setNodes] = useState<StoryNode[]>(seedCanvas.nodes);
  const [edges, setEdges] = useState<Edge[]>(seedCanvas.edges);
  const [documents, setDocuments] = useState<ProjectDocument[]>(
    seed.documents ?? initialDocuments,
  );
  const [canvases, setCanvases] = useState<StoryCanvas[]>(seedCanvases);
  const [activeCanvasId, setActiveCanvasId] = useState(seedCanvas.id);
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("mara");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"canvas" | "timeline" | "characters">(
    "canvas",
  );
  const [acts, setActs] = useState(initialSnapshot?.acts ?? initialActs);
  const [shareOpen, setShareOpen] = useState(false);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<StoryNode, Edge> | undefined
  >();
  const [contextMenu, setContextMenu] = useState<WorkspaceContextMenu | null>(
    null,
  );
  const openDocument = useMemo(
    () => documents.find((document) => document.id === openDocumentId),
    [documents, openDocumentId],
  );
  const selected = useMemo(
    () => nodes.find((node) => node.id === selectedId),
    [nodes, selectedId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId],
  );
  const displayEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        ...DARK_EDGE_LABEL,
        labelStyle: {
          ...edge.labelStyle,
          ...DARK_EDGE_LABEL.labelStyle,
        },
      })),
    [edges],
  );
  const contextNode =
    contextMenu?.kind === "node"
      ? nodes.find((node) => node.id === contextMenu.nodeId)
      : undefined;
  const contextDocumentId =
    contextMenu?.kind === "document"
      ? contextMenu.documentId
      : contextNode?.data.documentId;
  useEffect(() => {
    if (initialSnapshot) {
      const nextCanvases = initialSnapshot.canvases ?? [
        {
          id: "canvas-plot",
          title: "Plot map",
          nodes: initialSnapshot.nodes,
          edges: initialSnapshot.edges,
        },
      ];
      const nextCanvas =
        nextCanvases.find(
          (canvas) => canvas.id === initialSnapshot.activeCanvasId,
        ) ?? nextCanvases[0]!;
      setNodes(nextCanvas.nodes);
      setEdges(nextCanvas.edges);
      setActs(initialSnapshot.acts);
      setDocuments(initialSnapshot.documents ?? initialDocuments);
      setCanvases(nextCanvases);
      setActiveCanvasId(nextCanvas.id);
    }
  }, [initialSnapshot]);
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);
  const saveSnapshot = useCallback(
    (
      nextNodes: StoryNode[],
      nextEdges: Edge[],
      nextActs: TimelineAct[],
      nextDocuments = documents,
      nextCanvases = canvases,
    ) => {
      const synchronizedCanvases = nextCanvases.map((canvas) =>
        canvas.id === activeCanvasId
          ? { ...canvas, nodes: nextNodes, edges: nextEdges }
          : canvas,
      );
      setCanvases(synchronizedCanvases);
      onSnapshotChange?.({
        nodes: nextNodes,
        edges: nextEdges,
        acts: nextActs,
        documents: nextDocuments,
        canvases: synchronizedCanvases,
        activeCanvasId,
      });
    },
    [activeCanvasId, canvases, documents, onSnapshotChange],
  );
  const onNodesChange = useCallback(
    (changes: NodeChange<StoryNode>[]) =>
      setNodes((items) => {
        const next = applyNodeChanges(changes, items);
        saveSnapshot(next, edges, acts);
        return next;
      }),
    [acts, edges, saveSnapshot],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) =>
      setEdges((items) => {
        const next = applyEdgeChanges(changes, items);
        saveSnapshot(nodes, next, acts);
        return next;
      }),
    [acts, nodes, saveSnapshot],
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((items) => {
        const next = addEdge(
          {
            ...connection,
            ...DARK_EDGE_LABEL,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#8f86ff", strokeWidth: 1.5 },
          },
          items,
        );
        saveSnapshot(nodes, next, acts);
        return next;
      }),
    [acts, nodes, saveSnapshot],
  );
  const setActsSynced: React.Dispatch<React.SetStateAction<TimelineAct[]>> =
    useCallback(
      (action) =>
        setActs((items) => {
          const next = typeof action === "function" ? action(items) : action;
          saveSnapshot(nodes, edges, next);
          return next;
        }),
      [edges, nodes, saveSnapshot],
    );

  const addNote = (kind: StoryKind, position?: XYPosition) => {
    if (readOnly) return;
    const id = crypto.randomUUID();
    const config =
      kind === "character"
        ? {
            title: "New character",
            kicker: "CHARACTER",
            color: "violet",
            avatar: "NC",
          }
        : kind === "scene"
          ? { title: "Untitled scene", kicker: "SCENE", color: "amber" }
          : kind === "text"
            ? { title: "Write a thought…", color: "blue" }
            : kind === "group"
              ? { title: "New thread", color: "violet" }
              : { title: "Untitled note", kicker: "NOTE", color: "blue" };
    const title =
      kind === "note" || kind === "character" || kind === "scene"
        ? uniqueDocumentTitle(
            config.title,
            documents.map((document) => document.title),
          )
        : config.title;
    const projectDocument: ProjectDocument | null =
      kind === "note" || kind === "character" || kind === "scene"
        ? {
            id: `doc-${id}`,
            kind,
            title,
            body: "Start shaping this idea…",
            color: config.color,
            kicker:
              ("kicker" in config ? config.kicker : undefined) ??
              kind.toUpperCase(),
            ...(kind === "character" ? { avatar: "NC" } : {}),
            ...(kind === "scene"
              ? { status: "Idea", storyTime: "Unscheduled" }
              : {}),
          }
        : null;
    const node: StoryNode = {
      id,
      type:
        kind === "text"
          ? "rawText"
          : kind === "group"
            ? "storyGroup"
            : "storyCard",
      position: position ?? {
        x: 480 + Math.random() * 80,
        y: 280 + Math.random() * 80,
      },
      data: {
        kind,
        body:
          kind === "text" || kind === "group"
            ? undefined
            : "Start shaping this idea…",
        ...config,
        title,
        ...(projectDocument ? { documentId: projectDocument.id } : {}),
      },
      ...(kind === "group"
        ? { style: { width: 420, height: 280 }, zIndex: -1 }
        : {}),
    };
    setNodes((items) => {
      const next = [...items, node];
      const nextDocuments = projectDocument
        ? [...documents, projectDocument]
        : documents;
      if (projectDocument) setDocuments(nextDocuments);
      saveSnapshot(next, edges, acts, nextDocuments);
      return next;
    });
    setSelectedId(id);
  };

  const placeDocumentOnCanvas = (documentId: string, position?: XYPosition) => {
    if (readOnly) return;
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    const placement: StoryNode = {
      id: crypto.randomUUID(),
      type: "storyCard",
      position: position ?? {
        x: 440 + Math.random() * 100,
        y: 220 + Math.random() * 100,
      },
      data: {
        kind: document.kind,
        title: document.title,
        body: document.body,
        color: document.color,
        kicker: document.kicker,
        avatar: document.avatar,
        imageUrl: document.imageUrl,
        imageAssetId: document.imageAssetId,
        documentId: document.id,
      },
    };
    setNodes((items) => {
      const next = [...items, placement];
      saveSnapshot(next, edges, acts);
      return next;
    });
    setSelectedId(placement.id);
    setOpenDocumentId(null);
    setView("canvas");
    toast(
      `Placed “${document.title}” on ${canvases.find((item) => item.id === activeCanvasId)?.title ?? "canvas"}`,
    );
  };

  const addDocumentToTimeline = (documentId: string) => {
    if (readOnly) return;
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    setActsSynced((items) => {
      if (
        items.some((act) =>
          act.scenes.some((item) => item.documentId === documentId),
        )
      )
        return items;
      const entry: TimelineScene = {
        id: crypto.randomUUID(),
        documentId,
        kind: document.kind,
        title: document.title,
        synopsis: document.body.split("\n")[0] ?? "",
        status: document.status ?? "Idea",
        time: document.storyTime ?? "Unscheduled",
      };
      return items.map((act, index) =>
        index === 0 ? { ...act, scenes: [...act.scenes, entry] } : act,
      );
    });
    toast(`Added “${document.title}” to the timeline`);
  };

  const createTimelineNote = () => {
    if (readOnly) return;
    const title = uniqueDocumentTitle(
      "Untitled scene",
      documents.map((document) => document.title),
    );
    const document: ProjectDocument = {
      id: crypto.randomUUID(),
      kind: "scene",
      title,
      body: "Start shaping this scene…",
      color: "amber",
      kicker: "SCENE",
      status: "Idea",
      storyTime: "Unscheduled",
    };
    const nextDocuments = [...documents, document];
    setDocuments(nextDocuments);
    const nextActs = acts.map((act, index) =>
      index === 0
        ? {
            ...act,
            scenes: [
              ...act.scenes,
              {
                id: crypto.randomUUID(),
                documentId: document.id,
                kind: document.kind,
                title: document.title,
                synopsis: document.body,
                status: document.status!,
                time: document.storyTime!,
              },
            ],
          }
        : act,
    );
    setActs(nextActs);
    saveSnapshot(nodes, edges, nextActs, nextDocuments);
    setOpenDocumentId(document.id);
  };

  const switchCanvas = (canvasId: string) => {
    if (canvasId === activeCanvasId) return;
    const synchronized = canvases.map((canvas) =>
      canvas.id === activeCanvasId ? { ...canvas, nodes, edges } : canvas,
    );
    const target = synchronized.find((canvas) => canvas.id === canvasId);
    if (!target) return;
    setCanvases(synchronized);
    setActiveCanvasId(canvasId);
    setNodes(target.nodes);
    setEdges(target.edges);
    setSelectedId("");
    setSelectedEdgeId(null);
    onSnapshotChange?.({
      nodes: target.nodes,
      edges: target.edges,
      acts,
      documents,
      canvases: synchronized,
      activeCanvasId: canvasId,
    });
  };

  const addCanvas = () => {
    if (readOnly) return;
    const canvas: StoryCanvas = {
      id: crypto.randomUUID(),
      title: `Canvas ${canvases.length + 1}`,
      nodes: [],
      edges: [],
    };
    const synchronized = canvases
      .map((item) =>
        item.id === activeCanvasId ? { ...item, nodes, edges } : item,
      )
      .concat(canvas);
    setCanvases(synchronized);
    setActiveCanvasId(canvas.id);
    setNodes([]);
    setEdges([]);
    setView("canvas");
    onSnapshotChange?.({
      nodes: [],
      edges: [],
      acts,
      documents,
      canvases: synchronized,
      activeCanvasId: canvas.id,
    });
  };

  const duplicatePlacement = (nodeId: string) => {
    if (readOnly) return;
    const source = nodes.find((node) => node.id === nodeId);
    if (!source) return;
    const duplicate: StoryNode = {
      ...source,
      id: crypto.randomUUID(),
      selected: false,
      parentId: undefined,
      extent: undefined,
      position: { x: source.position.x + 32, y: source.position.y + 32 },
    };
    const nextNodes = [...nodes, duplicate];
    setNodes(nextNodes);
    setSelectedId(duplicate.id);
    saveSnapshot(nextNodes, edges, acts);
  };

  const removePlacement = (nodeId: string) => {
    if (readOnly) return;
    const removed = new Set([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes)
        if (
          node.parentId &&
          removed.has(node.parentId) &&
          !removed.has(node.id)
        ) {
          removed.add(node.id);
          changed = true;
        }
    }
    const nextNodes = nodes.filter((node) => !removed.has(node.id));
    const nextEdges = edges.filter(
      (edge) => !removed.has(edge.source) && !removed.has(edge.target),
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedId("");
    saveSnapshot(nextNodes, nextEdges, acts);
  };

  const deleteProjectDocument = (documentId: string) => {
    if (readOnly) return;
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;
    if (
      !window.confirm(
        `Delete “${document.title}” everywhere? Canvas placements and timeline references will be removed.`,
      )
    )
      return;
    const cleanCanvas = (canvas: StoryCanvas): StoryCanvas => {
      const removed = new Set(
        canvas.nodes
          .filter((node) => node.data.documentId === documentId)
          .map((node) => node.id),
      );
      return {
        ...canvas,
        nodes: canvas.nodes.filter((node) => !removed.has(node.id)),
        edges: canvas.edges.filter(
          (edge) => !removed.has(edge.source) && !removed.has(edge.target),
        ),
      };
    };
    const synchronized = canvases.map((canvas) =>
      canvas.id === activeCanvasId ? { ...canvas, nodes, edges } : canvas,
    );
    const nextCanvases = synchronized.map(cleanCanvas);
    const nextActive = nextCanvases.find(
      (canvas) => canvas.id === activeCanvasId,
    )!;
    const nextDocuments = documents.filter((item) => item.id !== documentId);
    const nextActs = acts.map((act) => ({
      ...act,
      scenes: act.scenes.filter((item) => item.documentId !== documentId),
    }));
    setDocuments(nextDocuments);
    setCanvases(nextCanvases);
    setNodes(nextActive.nodes);
    setEdges(nextActive.edges);
    setActs(nextActs);
    if (openDocumentId === documentId) setOpenDocumentId(null);
    saveSnapshot(
      nextActive.nodes,
      nextActive.edges,
      nextActs,
      nextDocuments,
      nextCanvases,
    );
  };

  const updateDocument = (
    documentId: string,
    patch: Partial<ProjectDocument>,
  ) => {
    if (readOnly) return;
    const currentDocument = documents.find(
      (document) => document.id === documentId,
    );
    if (!currentDocument) return;
    const requestedTitle = patch.title;
    const nextTitle =
      requestedTitle !== undefined
        ? uniqueDocumentTitle(
            requestedTitle,
            documents.map((document) => document.title),
            currentDocument.title,
          )
        : undefined;
    const normalizedPatch = {
      ...patch,
      ...(nextTitle ? { title: nextTitle } : {}),
    };
    const nextDocuments = documents.map((document) => {
      const renamedBody =
        nextTitle && nextTitle !== currentDocument.title
          ? renameWikiLinks(document.body, currentDocument.title, nextTitle)
          : document.body;
      return document.id === documentId
        ? { ...document, body: renamedBody, ...normalizedPatch }
        : { ...document, body: renamedBody };
    });
    const nextDocumentById = new globalThis.Map(
      nextDocuments.map((document) => [document.id, document]),
    );
    const updatePlacements = (items: StoryNode[]) =>
      items.map((node) => {
        const nextDocument = node.data.documentId
          ? nextDocumentById.get(node.data.documentId)
          : undefined;
        return nextDocument
          ? {
              ...node,
              data: {
                ...node.data,
                title: nextDocument.title,
                body: nextDocument.body,
                color: nextDocument.color,
                kicker: nextDocument.kicker,
                avatar: nextDocument.avatar,
                imageUrl: nextDocument.imageUrl,
                imageAssetId: nextDocument.imageAssetId,
              },
            }
          : node;
      });
    const nextNodes = updatePlacements(nodes);
    const nextCanvases = canvases.map((canvas) => ({
      ...canvas,
      nodes: updatePlacements(
        canvas.id === activeCanvasId ? nextNodes : canvas.nodes,
      ),
    }));
    const nextActs = acts.map((act) => ({
      ...act,
      scenes: act.scenes.map((item) => {
        const nextDocument = nextDocumentById.get(item.documentId);
        return nextDocument
          ? {
              ...item,
              title: nextDocument.title,
              synopsis: nextDocument.body.split("\n")[0] ?? "",
              status: nextDocument.status ?? item.status,
              time: nextDocument.storyTime ?? item.time,
            }
          : item;
      }),
    }));
    setDocuments(nextDocuments);
    setNodes(nextNodes);
    setCanvases(nextCanvases);
    setActs(nextActs);
    saveSnapshot(nextNodes, edges, nextActs, nextDocuments, nextCanvases);
  };

  const updateSelected = (patch: Partial<StoryData>) => {
    if (readOnly || !selected) return;
    if (selected.data.documentId) {
      updateDocument(selected.data.documentId, {
        ...(typeof patch.title === "string" ? { title: patch.title } : {}),
        ...(typeof patch.body === "string" ? { body: patch.body } : {}),
        ...(typeof patch.color === "string" ? { color: patch.color } : {}),
        ...(typeof patch.kicker === "string" ? { kicker: patch.kicker } : {}),
        ...(typeof patch.imageUrl === "string"
          ? { imageUrl: patch.imageUrl }
          : {}),
        ...(typeof patch.imageAssetId === "string"
          ? { imageAssetId: patch.imageAssetId }
          : {}),
      });
      return;
    }
    setNodes((items) => {
      const next = items.map((node) =>
        node.id === selected.id
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      );
      saveSnapshot(next, edges, acts);
      return next;
    });
  };
  const updateSelectedEdge = (patch: Partial<Edge>) =>
    !readOnly &&
    selectedEdge &&
    setEdges((items) => {
      const next = items.map((edge) =>
        edge.id === selectedEdge.id ? { ...edge, ...patch } : edge,
      );
      saveSnapshot(nodes, next, acts);
      return next;
    });
  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  };
  const runContextAction = (action: () => void) => {
    setContextMenu(null);
    action();
  };

  return (
    <main className={`studio-shell ${readOnly ? "read-only" : ""}`}>
      <header className="studio-header">
        <div className="studio-brand">
          <Link href="/" aria-label="Back home">
            <Feather size={16} />
          </Link>
          <span className="header-rule" />
          <button>
            <span className="project-glyph">
              <Sparkles size={13} />
            </span>
            <span>
              <small>{readOnly ? "READ-ONLY PROJECT" : "PROJECT"}</small>
              {projectTitle}
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="view-tabs">
          <button
            className={view === "canvas" ? "active" : ""}
            onClick={() => {
              setOpenDocumentId(null);
              setView("canvas");
            }}
          >
            <Map size={14} />
            {canvases.find((canvas) => canvas.id === activeCanvasId)?.title ??
              "Canvas"}
          </button>
          <button
            className={view === "timeline" ? "active" : ""}
            onClick={() => {
              setOpenDocumentId(null);
              setView("timeline");
            }}
          >
            <Clock3 size={14} />
            Timeline
          </button>
          <button
            className={view === "characters" ? "active" : ""}
            onClick={() => {
              setOpenDocumentId(null);
              setView("characters");
            }}
          >
            <Users size={14} />
            Characters
          </button>
        </div>
        <div className="header-tools">
          <span className="save-status">
            <i />
            All changes saved
          </span>
          <div className="avatar-stack">
            <i>EK</i>
            <i>MA</i>
            <i>+2</i>
          </div>
          {projectId ? (
            <a
              className="icon-button"
              title="Export"
              href={`/api/projects/${projectId}/export`}
            >
              <FileDown size={15} />
            </a>
          ) : (
            <button
              className="icon-button"
              title="Export"
              onClick={() => toast("Project prepared for export")}
            >
              <FileDown size={15} />
            </button>
          )}
          <button className="share-button" onClick={() => setShareOpen(true)}>
            <Share2 size={14} />
            Share
          </button>
        </div>
      </header>
      <div className={`studio-body ${openDocument ? "document-open" : ""}`}>
        <aside className="library-panel">
          <div className="panel-title">
            <span>PROJECT FILES</span>
            <button aria-label="Add canvas" onClick={addCanvas}>
              <Plus size={14} />
            </button>
          </div>
          <button className="search-field">
            <Search size={14} />
            <span>Search this story</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="file-tree-section">
            <div className="file-tree-heading">
              <small>CANVASES</small>
              <button onClick={addCanvas} aria-label="New canvas">
                <Plus size={12} />
              </button>
            </div>
            {canvases.map((canvas) => (
              <button
                key={canvas.id}
                className={`file-row ${canvas.id === activeCanvasId && view === "canvas" ? "active" : ""}`}
                onClick={() => {
                  switchCanvas(canvas.id);
                  setOpenDocumentId(null);
                  setView("canvas");
                }}
              >
                <PanelsTopLeft size={14} />
                <span>{canvas.title}</span>
                <small>{canvas.nodes.length}</small>
              </button>
            ))}
          </div>
          <div className="file-tree-section document-tree">
            <div className="file-tree-heading">
              <small>NOTES</small>
              <div>
                <button onClick={() => addNote("note")} aria-label="New note">
                  <StickyNote size={12} />
                </button>
                <button
                  onClick={() => addNote("character")}
                  aria-label="New character"
                >
                  <CircleUserRound size={12} />
                </button>
                <button onClick={() => addNote("scene")} aria-label="New scene">
                  <BookOpen size={12} />
                </button>
              </div>
            </div>
            {documents.map((document) => (
              <div className="document-file-row" key={document.id}>
                <button
                  draggable={!readOnly}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      STORY_DOCUMENT_DRAG_TYPE,
                      document.id,
                    );
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({
                      kind: "document",
                      x: event.clientX,
                      y: event.clientY,
                      documentId: document.id,
                    });
                  }}
                  onClick={() => setOpenDocumentId(document.id)}
                >
                  {document.kind === "character" ? (
                    <CircleUserRound size={14} />
                  ) : document.kind === "scene" ? (
                    <BookOpen size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span>{document.title}</span>
                </button>
                {!readOnly ? (
                  <button
                    className="place-file"
                    title={
                      view === "timeline"
                        ? "Add to timeline"
                        : "Place on canvas"
                    }
                    onClick={() =>
                      view === "timeline"
                        ? addDocumentToTimeline(document.id)
                        : placeDocumentOnCanvas(document.id)
                    }
                  >
                    <Plus size={12} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="canvas-tools">
            <button onClick={() => addNote("text")}>
              <Type size={13} /> Raw text
            </button>
            <button onClick={() => addNote("group")}>
              <LayoutDashboard size={13} /> Group
            </button>
            <button onClick={() => toast("Drag between any two handles")}>
              <GitBranch size={13} /> Connection
            </button>
          </div>
          <div className="library-footer">
            <MousePointer2 size={13} />
            <span>Double-click a card to open its note</span>
          </div>
        </aside>
        {openDocument ? (
          <DocumentEditor
            document={openDocument}
            documents={documents}
            readOnly={readOnly}
            onClose={() => setOpenDocumentId(null)}
            onChange={(patch) => updateDocument(openDocument.id, patch)}
            onPlaceCanvas={() => placeDocumentOnCanvas(openDocument.id)}
            onPlaceTimeline={() => addDocumentToTimeline(openDocument.id)}
            onOpenDocument={setOpenDocumentId}
          />
        ) : (
          <>
            {view === "canvas" ? (
              <section
                className="canvas-stage"
                aria-label="Story canvas"
                onDragOver={(event) => {
                  if (
                    event.dataTransfer.types.includes(STORY_DOCUMENT_DRAG_TYPE)
                  ) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }
                }}
                onDrop={(event) => {
                  const documentId = event.dataTransfer.getData(
                    STORY_DOCUMENT_DRAG_TYPE,
                  );
                  if (!documentId || !flowInstance || readOnly) return;
                  event.preventDefault();
                  placeDocumentOnCanvas(
                    documentId,
                    flowInstance.screenToFlowPosition({
                      x: event.clientX,
                      y: event.clientY,
                    }),
                  );
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={displayEdges}
                  onInit={setFlowInstance}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onPaneClick={() => setContextMenu(null)}
                  onPaneContextMenu={(event) => {
                    event.preventDefault();
                    if (readOnly || !flowInstance) return;
                    setContextMenu({
                      kind: "pane",
                      x: event.clientX,
                      y: event.clientY,
                      position: flowInstance.screenToFlowPosition({
                        x: event.clientX,
                        y: event.clientY,
                      }),
                    });
                  }}
                  onNodeContextMenu={(event, node) => {
                    event.preventDefault();
                    setContextMenu({
                      kind: "node",
                      x: event.clientX,
                      y: event.clientY,
                      nodeId: node.id,
                    });
                  }}
                  onNodeDoubleClick={(_event, node) => {
                    if (node.data.documentId)
                      setOpenDocumentId(node.data.documentId);
                  }}
                  onSelectionChange={({
                    nodes: selectedNodes,
                    edges: selectedEdges,
                  }) => {
                    if (selectedNodes[0]) {
                      setSelectedId(selectedNodes[0].id);
                      setSelectedEdgeId(null);
                    } else if (selectedEdges[0]) {
                      setSelectedEdgeId(selectedEdges[0].id);
                    }
                  }}
                  fitView
                  minZoom={0.25}
                  maxZoom={2}
                  deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
                  nodesDraggable={!readOnly}
                  nodesConnectable={!readOnly}
                  multiSelectionKeyCode="Shift"
                  selectionOnDrag={!readOnly}
                  panOnScroll
                  defaultEdgeOptions={{
                    type: "smoothstep",
                    ...DARK_EDGE_LABEL,
                  }}
                >
                  <Background
                    color="#272632"
                    gap={22}
                    size={1}
                    variant={BackgroundVariant.Dots}
                  />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) =>
                      node.data?.color === "amber"
                        ? "#d4a45d"
                        : node.data?.color === "green"
                          ? "#65ad94"
                          : node.data?.color === "blue"
                            ? "#6f9fcc"
                            : "#8f86ff"
                    }
                  />
                  <Controls showInteractive={false} />
                </ReactFlow>
                <div className="floating-history">
                  <button
                    title="Undo"
                    onClick={() =>
                      onUndo
                        ? onUndo()
                        : toast("Nothing else to undo in the preview")
                    }
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    title="Redo"
                    onClick={() =>
                      onRedo
                        ? onRedo()
                        : toast("Nothing else to redo in the preview")
                    }
                  >
                    <Redo2 size={14} />
                  </button>
                  <span />
                  <button>62%</button>
                </div>
              </section>
            ) : view === "timeline" ? (
              <TimelineBoard
                acts={acts}
                setActs={setActsSynced}
                readOnly={readOnly}
                onCreateScene={createTimelineNote}
                onSelect={(documentId) => setOpenDocumentId(documentId)}
              />
            ) : (
              <CharacterIndex
                documents={documents}
                onSelect={(id) => setOpenDocumentId(id)}
              />
            )}
            <aside className="inspector-panel">
              {selectedEdge ? (
                <EdgeInspector
                  edge={selectedEdge}
                  readOnly={readOnly}
                  onChange={updateSelectedEdge}
                />
              ) : selected ? (
                <>
                  <div className="inspector-heading">
                    <div>
                      <small>{selected.data.kind.toUpperCase()}</small>
                      <h2>{selected.data.title}</h2>
                    </div>
                    <button aria-label="Close inspector">×</button>
                  </div>
                  <div className="inspector-section">
                    <label>Color</label>
                    <div className="color-row">
                      {["violet", "blue", "amber", "green", "rose"].map(
                        (color) => (
                          <button
                            disabled={readOnly}
                            key={color}
                            className={`${color} ${selected.data.color === color ? "active" : ""}`}
                            aria-label={`${color} color`}
                            onClick={() => updateSelected({ color })}
                          />
                        ),
                      )}
                    </div>
                  </div>
                  {selected.data.documentId ? (
                    <div className="inspector-section">
                      <button
                        className="open-document-button"
                        onClick={() =>
                          setOpenDocumentId(selected.data.documentId!)
                        }
                      >
                        <FileText size={15} /> Open full note
                      </button>
                    </div>
                  ) : null}
                  {selected.data.kind === "character" ? (
                    <div className="inspector-section">
                      <label>Portrait</label>
                      {projectId ? (
                        <PortraitUploader
                          projectId={projectId}
                          disabled={readOnly}
                          onComplete={(asset) =>
                            updateSelected({
                              imageAssetId: asset.id,
                              imageUrl: asset.url,
                            })
                          }
                        />
                      ) : (
                        <button
                          disabled={readOnly}
                          className="upload-field"
                          onClick={() =>
                            toast("Connect UploadThing to add a portrait")
                          }
                        >
                          <ImagePlus size={17} />
                          <span>
                            Upload an image
                            <small>PNG, JPG or WebP · max 8 MB</small>
                          </span>
                        </button>
                      )}
                    </div>
                  ) : null}
                  <div className="inspector-section">
                    <label>
                      {selected.data.kind === "character" ? "Name" : "Title"}
                    </label>
                    <input
                      disabled={readOnly}
                      value={selected.data.title}
                      onChange={(event) =>
                        updateSelected({ title: event.target.value })
                      }
                    />
                  </div>
                  {selected.data.kind !== "text" &&
                  selected.data.kind !== "group" ? (
                    <div className="inspector-section grow">
                      <label>Description</label>
                      <textarea
                        disabled={readOnly}
                        value={selected.data.body ?? ""}
                        onChange={(event) =>
                          updateSelected({ body: event.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="inspector-meta">
                    <span>Created 2 days ago</span>
                    <span>{readOnly ? "Viewing" : "Edited just now"}</span>
                  </div>
                </>
              ) : (
                <div className="empty-inspector">
                  <MousePointer2 size={22} />
                  <p>Select an element to shape its details.</p>
                </div>
              )}
            </aside>
          </>
        )}
      </div>
      {contextMenu ? (
        <ContextMenu menu={contextMenu}>
          {contextMenu.kind === "pane" ? (
            <>
              <small>CREATE HERE</small>
              <button
                role="menuitem"
                onClick={() =>
                  runContextAction(() => addNote("note", contextMenu.position))
                }
              >
                <StickyNote size={14} /> New note
              </button>
              <button
                role="menuitem"
                onClick={() =>
                  runContextAction(() =>
                    addNote("character", contextMenu.position),
                  )
                }
              >
                <CircleUserRound size={14} /> New character
              </button>
              <button
                role="menuitem"
                onClick={() =>
                  runContextAction(() => addNote("scene", contextMenu.position))
                }
              >
                <BookOpen size={14} /> New scene
              </button>
              <span />
              <button
                role="menuitem"
                onClick={() =>
                  runContextAction(() => addNote("text", contextMenu.position))
                }
              >
                <Type size={14} /> Raw text
              </button>
              <button
                role="menuitem"
                onClick={() =>
                  runContextAction(() => addNote("group", contextMenu.position))
                }
              >
                <LayoutDashboard size={14} /> Group
              </button>
            </>
          ) : (
            <>
              <small>
                {contextMenu.kind === "document"
                  ? "PROJECT NOTE"
                  : "CANVAS ITEM"}
              </small>
              {contextDocumentId ? (
                <button
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() => setOpenDocumentId(contextDocumentId))
                  }
                >
                  <ExternalLink size={14} /> Open note
                </button>
              ) : null}
              {!readOnly && contextDocumentId ? (
                <button
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() =>
                      addDocumentToTimeline(contextDocumentId),
                    )
                  }
                >
                  <Clock3 size={14} /> Add to timeline
                </button>
              ) : null}
              {!readOnly && contextMenu.kind === "document" ? (
                <button
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() =>
                      placeDocumentOnCanvas(contextMenu.documentId),
                    )
                  }
                >
                  <Map size={14} /> Place on canvas
                </button>
              ) : null}
              {!readOnly && contextMenu.kind === "node" ? (
                <>
                  <button
                    role="menuitem"
                    onClick={() =>
                      runContextAction(() =>
                        duplicatePlacement(contextMenu.nodeId),
                      )
                    }
                  >
                    <Copy size={14} /> Duplicate placement
                  </button>
                  <span />
                  <button
                    role="menuitem"
                    onClick={() =>
                      runContextAction(() =>
                        removePlacement(contextMenu.nodeId),
                      )
                    }
                  >
                    <Trash2 size={14} /> Remove from canvas
                  </button>
                </>
              ) : null}
              {!readOnly && contextDocumentId ? (
                <button
                  className="danger"
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() =>
                      deleteProjectDocument(contextDocumentId),
                    )
                  }
                >
                  <Trash2 size={14} /> Delete note everywhere…
                </button>
              ) : null}
            </>
          )}
        </ContextMenu>
      ) : null}
      {notice ? <div className="studio-toast">{notice}</div> : null}
      {shareOpen ? (
        <ShareDialog
          projectId={projectId}
          shareId={shareId}
          publicSlug={publicSlug}
          initialVisibility={visibility}
          canManage={canManage}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </main>
  );
}
