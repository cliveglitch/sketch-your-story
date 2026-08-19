import Link from "next/link";
import {
  ArrowRight,
  Feather,
  GitBranch,
  Layers3,
  Sparkles,
} from "lucide-react";

const features = [
  { icon: Layers3, label: "Shape scenes into acts" },
  { icon: GitBranch, label: "Map every relationship" },
  { icon: Sparkles, label: "Think together in real time" },
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link
          href="/"
          className="brand-lockup"
          aria-label="Sketch Your Story home"
        >
          <span className="brand-mark">
            <Feather size={17} />
          </span>
          <span>Sketch Your Story</span>
        </Link>
        <div className="landing-actions">
          <Link href="/api/auth/signin" className="ghost-button">
            Sign in
          </Link>
          <Link href="/demo" className="primary-button">
            Open the studio <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            A visual studio for stories in their earliest form
          </p>
          <h1>Find the shape of your story.</h1>
          <p className="hero-lede">
            Pin down sparks, connect characters, and arrange scenes before the
            first sentence asks to be written.
          </p>
          <div className="hero-actions">
            <Link href="/demo" className="primary-button large">
              Explore a sample story <ArrowRight size={16} />
            </Link>
            <span className="fine-print">
              No account needed for the preview
            </span>
          </div>
          <div className="feature-row">
            {features.map(({ icon: Icon, label }) => (
              <span key={label}>
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/demo"
          className="hero-workspace"
          aria-label="Open interactive studio preview"
        >
          <div className="workspace-topline">
            <span className="workspace-dots">
              <i />
              <i />
              <i />
            </span>
            <span>The Glass Orchard</span>
            <span className="workspace-presence">
              <i>EK</i>
              <i>MA</i>
              <b>+2</b>
            </span>
          </div>
          <div className="workspace-preview">
            <div className="preview-rail">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-grid">
              <article className="preview-card violet">
                <small>CHARACTER</small>
                <strong>Mara Vale</strong>
                <p>Cartographer of places that no longer exist.</p>
              </article>
              <article className="preview-card amber">
                <small>SCENE 07</small>
                <strong>The orchard remembers</strong>
                <p>Mara finds her own childhood mapped in glass.</p>
              </article>
              <article className="preview-card blue">
                <small>NOTE</small>
                <strong>The cost of memory</strong>
                <p>What survives when remembering changes the past?</p>
              </article>
              <div className="preview-thread one" />
              <div className="preview-thread two" />
              <div className="preview-label">protects → betrays</div>
              <div className="preview-cursor">Elena</div>
            </div>
          </div>
          <span className="workspace-cta">
            Enter the canvas <ArrowRight size={14} />
          </span>
        </Link>
      </section>
    </main>
  );
}
