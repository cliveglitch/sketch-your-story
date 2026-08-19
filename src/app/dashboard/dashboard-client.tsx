"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ChevronDown,
  Clock3,
  Feather,
  FileUp,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type Project = {
  id: string;
  title: string;
  description: string;
  updatedAt: Date;
  visibility: "restricted" | "anyone_with_link" | "public";
  role: "owner" | "editor" | "viewer" | null;
};

export function DashboardClient({
  user,
  projects: initial,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  projects: Project[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const create = api.project.create.useMutation({
    onSuccess: (project) => router.push(`/projects/${project?.id}`),
  });
  const projects = initial.filter((project) =>
    project.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">
            <Feather size={17} />
          </span>
          <span>Sketch Your Story</span>
        </Link>
        <nav>
          <Link href="/dashboard" className="active">
            <BookOpen size={15} />
            Projects
          </Link>
          <button>
            <Users size={15} />
            Shared with me
          </button>
          <button>
            <Clock3 size={15} />
            Recent
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button>
            <Settings2 size={15} />
            Settings
          </button>
          <div className="account-chip">
            <span>
              {user.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={29}
                  height={29}
                  unoptimized
                />
              ) : (
                (user.name?.slice(0, 2).toUpperCase() ?? "WR")
              )}
            </span>
            <div>
              <strong>{user.name ?? "Writer"}</strong>
              <small>{user.email}</small>
            </div>
            <ChevronDown size={13} />
          </div>
        </div>
      </aside>
      <section className="dashboard-main">
        <header>
          <div>
            <p className="eyebrow">YOUR WRITING STUDIO</p>
            <h1>Projects</h1>
          </div>
          <div className="dashboard-actions">
            <label>
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects"
              />
            </label>
            <button
              className="import-button"
              disabled={importing}
              onClick={() => importRef.current?.click()}
            >
              <FileUp size={14} />
              {importing ? "Importing…" : "Import"}
            </button>
            <input
              ref={importRef}
              hidden
              type="file"
              accept=".zip,.sketchstory.zip,application/zip"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImporting(true);
                const form = new FormData();
                form.set("file", file);
                const response = await fetch("/api/projects/import", {
                  method: "POST",
                  body: form,
                });
                const result = (await response.json()) as {
                  projectId?: string;
                  error?: string;
                };
                setImporting(false);
                if (response.ok && result.projectId)
                  router.push(`/projects/${result.projectId}`);
                else window.alert(result.error ?? "Import failed");
              }}
            />
            <button className="primary-button" onClick={() => setDialog(true)}>
              <Plus size={15} />
              New project
            </button>
          </div>
        </header>
        <div className="project-grid">
          <button className="new-project-card" onClick={() => setDialog(true)}>
            <span>
              <Plus size={22} />
            </span>
            <strong>Begin a new story</strong>
            <small>Start with an empty canvas</small>
          </button>
          {projects.map((project, index) => (
            <Link
              href={`/projects/${project.id}`}
              className="project-card"
              key={project.id}
            >
              <div className={`project-art art-${index % 4}`}>
                <span className="art-note one" />
                <span className="art-note two" />
                <span className="art-note three" />
                <i />
              </div>
              <div className="project-info">
                <div>
                  <small>
                    {project.role?.toUpperCase()} ·{" "}
                    {project.visibility.replaceAll("_", " ").toUpperCase()}
                  </small>
                  <h2>{project.title}</h2>
                  <p>
                    {project.description || "A story still finding its shape."}
                  </p>
                </div>
                <button aria-label="Project menu">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {dialog ? (
        <div className="modal-backdrop" onMouseDown={() => setDialog(false)}>
          <form
            className="new-project-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim())
                create.mutate({ title: title.trim(), description: "" });
            }}
          >
            <span className="dialog-glyph">
              <Sparkles size={18} />
            </span>
            <p className="eyebrow">A BLANK PAGE, BUT BETTER</p>
            <h2>Name your new story</h2>
            <p>You can change this at any time.</p>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The story without a name"
              maxLength={120}
            />
            <div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDialog(false)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={!title.trim() || create.isPending}
              >
                {create.isPending ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
