/** Streaming fallback for the admin console while the structure query runs. */
export default function AdminLoading() {
  return (
    <div className="admin-page" aria-busy>
      <h1>League structure</h1>
      <p className="admin-sub" role="status">
        Loading seasons and divisions…
      </p>

      <section className="admin-grid" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="admin-card">
            <div className="lg-skel lg-skel-line" style={{ width: 120 }} />
            <div className="lg-skel lg-skel-field" />
            <div className="lg-skel lg-skel-field" />
            <div className="lg-skel lg-skel-cta" />
          </div>
        ))}
      </section>
    </div>
  );
}
