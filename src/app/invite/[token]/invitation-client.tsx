"use client";

import Link from "next/link";
import { Feather, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function InvitationClient({
  token,
  signedIn,
}: {
  token: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const accept = api.project.acceptInvitation.useMutation({
    onSuccess: ({ projectId }) => router.push(`/projects/${projectId}`),
  });
  return (
    <main className="auth-page">
      <Link href="/" className="brand-lockup">
        <span className="brand-mark">
          <Feather size={17} />
        </span>
        <span>Sketch Your Story</span>
      </Link>
      <section className="auth-card">
        <span className="dialog-glyph">
          <Users size={20} />
        </span>
        <p className="eyebrow">COLLABORATION INVITE</p>
        <h1>A writer invited you into their story.</h1>
        <p>
          Accept the invitation to join the project with the role they selected.
        </p>
        {signedIn ? (
          <button
            className="github-button"
            onClick={() => accept.mutate({ token })}
            disabled={accept.isPending}
          >
            {accept.isPending ? "Opening the project…" : "Accept invitation"}
          </button>
        ) : (
          <Link
            className="github-button"
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
          >
            Sign in with GitHub to accept
          </Link>
        )}
        {accept.error ? (
          <p className="form-error">{accept.error.message}</p>
        ) : null}
      </section>
    </main>
  );
}
