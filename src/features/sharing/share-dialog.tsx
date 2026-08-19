"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Globe2,
  Link2,
  LockKeyhole,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";
import type { ProjectVisibility } from "~/lib/story-document";

export function ShareDialog({
  projectId,
  shareId,
  publicSlug,
  initialVisibility,
  canManage,
  onClose,
}: {
  projectId?: string;
  shareId?: string;
  publicSlug?: string | null;
  initialVisibility: ProjectVisibility;
  canManage: boolean;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [inviteUrl, setInviteUrl] = useState("");
  const [githubLogin, setGithubLogin] = useState("");
  const [memberMessage, setMemberMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const setVisibilityMutation = api.project.setVisibility.useMutation();
  const invitation = api.project.createInvitation.useMutation({
    onSuccess: (result) => {
      setInviteUrl(result.url);
      void copy(result.url);
    },
  });
  const addMember = api.project.addMember.useMutation({
    onSuccess: (member) => {
      setMemberMessage(
        `@${member.githubLogin} can now ${member.role === "editor" ? "edit" : "view"}.`,
      );
      setGithubLogin("");
    },
    onError: (error) => setMemberMessage(error.message),
  });
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const viewUrl = useMemo(
    () =>
      visibility === "public" && publicSlug
        ? `${baseUrl}/p/${publicSlug}`
        : visibility === "anyone_with_link" && shareId
          ? `${baseUrl}/share/${shareId}`
          : "",
    [baseUrl, publicSlug, shareId, visibility],
  );
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const changeVisibility = (next: ProjectVisibility) => {
    setVisibility(next);
    if (projectId)
      setVisibilityMutation.mutate({ id: projectId, visibility: next });
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="share-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">PROJECT ACCESS</p>
            <h2>Share this story</h2>
          </div>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="share-section">
          <label>Invite a collaborator</label>
          <div className="member-row">
            <span>@</span>
            <input
              value={githubLogin}
              onChange={(event) => setGithubLogin(event.target.value)}
              placeholder="GitHub username"
              disabled={!canManage}
            />
            <select
              value={role}
              disabled={!canManage}
              onChange={(event) =>
                setRole(event.target.value as "editor" | "viewer")
              }
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button
              disabled={
                !projectId || !githubLogin.trim() || addMember.isPending
              }
              onClick={() =>
                projectId &&
                addMember.mutate({
                  id: projectId,
                  githubLogin: githubLogin.trim(),
                  role,
                })
              }
            >
              {addMember.isPending ? "Adding…" : "Add"}
            </button>
          </div>
          {memberMessage ? (
            <small className="member-message">{memberMessage}</small>
          ) : null}
          <div className="invite-row">
            <span>
              <UserPlus size={15} />
              Single-use invite link
            </span>
            <select
              value={role}
              disabled={!canManage}
              onChange={(event) =>
                setRole(event.target.value as "editor" | "viewer")
              }
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button
              disabled={!canManage || !projectId || invitation.isPending}
              onClick={() =>
                projectId &&
                invitation.mutate({ id: projectId, role, expiresInDays: 7 })
              }
            >
              {invitation.isPending ? "Creating…" : "Create link"}
            </button>
          </div>
          {inviteUrl ? (
            <button
              className="generated-link"
              onClick={() => void copy(inviteUrl)}
            >
              <span>{inviteUrl}</span>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          ) : null}
          <small>Invite links expire in 7 days and can be accepted once.</small>
        </div>
        <div className="share-section">
          <label>General access</label>
          <div className="visibility-options">
            <button
              className={visibility === "restricted" ? "active" : ""}
              disabled={!canManage}
              onClick={() => changeVisibility("restricted")}
            >
              <LockKeyhole size={16} />
              <span>
                <strong>Restricted</strong>
                <small>Only invited people can open</small>
              </span>
            </button>
            <button
              className={visibility === "anyone_with_link" ? "active" : ""}
              disabled={!canManage}
              onClick={() => changeVisibility("anyone_with_link")}
            >
              <Link2 size={16} />
              <span>
                <strong>Anyone with the link</strong>
                <small>Anonymous, read-only access</small>
              </span>
            </button>
            <button
              className={visibility === "public" ? "active" : ""}
              disabled={!canManage}
              onClick={() => changeVisibility("public")}
            >
              <Globe2 size={16} />
              <span>
                <strong>Public</strong>
                <small>Discoverable and read-only</small>
              </span>
            </button>
          </div>
          {viewUrl ? (
            <button
              className="copy-view-link"
              onClick={() => void copy(viewUrl)}
            >
              <span>Copy reader link</span>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
