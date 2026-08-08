/**
 * Streaming fallback for the league browse — the skeleton grid from the A2
 * design spec. Purely decorative: the live region below announces the wait, and
 * the shimmer is disabled under prefers-reduced-motion.
 */
export default function LeaguesLoading() {
  return (
    <main className="app-main" aria-busy>
      <header className="lg-head">
        <span className="eyebrow">Leagues</span>
        <h1>Find Your League</h1>
        <p role="status">Loading open divisions…</p>
      </header>

      <div className="lg-grid lg-grid-skel" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="lg-card lg-skel-card">
            <div className="lg-card-top">
              <span className="lg-skel lg-skel-line" style={{ width: 72 }} />
              <span className="lg-skel lg-skel-pill" />
            </div>
            <div className="lg-skel lg-skel-title" />
            <div className="lg-skel lg-skel-line" style={{ width: "45%" }} />
            <div className="lg-skel lg-skel-stats" />
            <div className="lg-skel lg-skel-bar" />
            <div className="lg-skel lg-skel-cta" />
          </div>
        ))}
      </div>
    </main>
  );
}
