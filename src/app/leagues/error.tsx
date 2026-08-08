"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for the whole leagues surface (browse + detail). Reached when
 * the league query actually fails — an unconfigured database renders the soft
 * "opening soon" state instead, so anything landing here is a real fault.
 */
export default function LeaguesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[leagues] failed to render:", error);
  }, [error]);

  return (
    <main className="app-main">
      <div className="empty" role="alert">
        <div className="ic" aria-hidden>
          ⚠️
        </div>
        <h3>We couldn&apos;t load the leagues</h3>
        <p>
          Something went wrong on our side. Try again — if it keeps happening,
          the league service is likely down.
        </p>
        <div className="lg-error-actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/leagues" className="btn btn-ghost">
            Back to browse
          </Link>
        </div>
      </div>
    </main>
  );
}
