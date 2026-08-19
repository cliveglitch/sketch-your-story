import { Code2 as Github, Feather } from "lucide-react";
import Link from "next/link";
import { signIn } from "~/server/auth";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand-lockup">
        <span className="brand-mark">
          <Feather size={17} />
        </span>
        <span>Sketch Your Story</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">Your stories are waiting</p>
        <h1>Come back to the studio.</h1>
        <p>
          Sign in to open your projects, collaborate with trusted readers, and
          keep every spark safely in the cloud.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="github-button">
            <Github size={18} />
            Continue with GitHub
          </button>
        </form>
        <small>
          We only use your GitHub identity to secure your workspace.
        </small>
      </section>
    </main>
  );
}
