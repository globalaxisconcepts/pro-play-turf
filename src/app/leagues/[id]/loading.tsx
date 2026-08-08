/**
 * Streaming fallback for a single league. Without this the browse skeleton in
 * ../loading.tsx would stand in for the detail route and show the wrong shape.
 */
export default function LeagueDetailLoading() {
  return (
    <main className="app-main" aria-busy>
      <p className="lg-back" role="status">
        Loading league…
      </p>

      <div className="lg-detail-head" aria-hidden>
        <div style={{ flex: 1 }}>
          <div className="lg-skel lg-skel-line" style={{ width: 180 }} />
          <div className="lg-skel lg-skel-title" style={{ height: 44 }} />
        </div>
        <span className="lg-skel lg-skel-pill" />
      </div>

      <div className="lg-detail-stats" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bal-card">
            <div className="lg-skel lg-skel-line" style={{ width: 64 }} />
            <div className="lg-skel lg-skel-title" style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
