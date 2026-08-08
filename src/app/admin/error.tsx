"use client";

import { useEffect } from "react";

/**
 * Admin error boundary. The console reads and writes league structure directly,
 * so a database fault must surface as a failure here — never as an empty
 * "no seasons yet" state that would invite a duplicate season.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] failed to render:", error);
  }, [error]);

  return (
    <div className="empty" role="alert">
      <div className="ic" aria-hidden>
        ⚠️
      </div>
      <h3>Admin console unavailable</h3>
      <p>
        The database didn&apos;t respond, so the league structure couldn&apos;t
        be read. Nothing was changed.
      </p>
      <div className="lg-error-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
