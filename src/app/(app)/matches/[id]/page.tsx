import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { safeExternalUrl } from "@/lib/urls";
import { auth } from "@/server/auth";
import { matchService, proofStorage } from "@/server/services";
import { DisputeForm } from "./_components/DisputeForm";
import { ReportForm } from "./_components/ReportForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Match Room" };

/** A result can only be contested once it exists in some form. */
const DISPUTABLE_STATES = ["VERIFIED", "UNDER_REVIEW", "DISPUTED", "AWAITING"];

/** Player-facing copy for each state, and what happens next. */
const STATE_COPY: Record<string, { label: string; next: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    next: "Play your opponent, then both of you report the score here.",
  },
  LIVE: { label: "Live", next: "Match in progress — report the score when you finish." },
  AWAITING: {
    label: "Awaiting opponent",
    next: "Your report is in. The result is confirmed once your opponent agrees.",
  },
  VERIFIED: {
    label: "Verified",
    next: "Both players reported the same score. This result counts.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    next: "The two reports disagree. A reviewer will decide using the evidence.",
  },
  DISPUTED: {
    label: "Disputed",
    next: "This match has been formally contested and is with the tribunal.",
  },
  VOID: { label: "Void", next: "A reviewer annulled this match. It doesn't count." },
};

export default async function MatchRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isDatabaseConfigured()) notFound();

  const { userId } = await auth();
  const match = await matchService.getMatch(id);
  if (!match) notFound();

  const isPlayer =
    match.homeUserId === userId || match.awayUserId === userId;
  const mine = match.submissions.find((s) => s.userId === userId);
  const canReport =
    isPlayer &&
    !mine &&
    ["SCHEDULED", "LIVE", "AWAITING"].includes(match.status);
  const copy = STATE_COPY[match.status] ?? STATE_COPY.SCHEDULED;

  return (
    <main className="app-main">
      <Link href={`/leagues/${match.leagueId}?tab=fixtures`} className="lg-back">
        ← {match.league.name}
      </Link>

      <header className="mr-head">
        <div>
          <span className="eyebrow">Round {match.round}</span>
          <h1>
            {match.home.displayName} <span className="mr-v">vs</span>{" "}
            {match.away.displayName}
          </h1>
        </div>
        <span className="lg-badge" data-status={match.status}>
          {match.status === "LIVE" && <span className="lg-dot" aria-hidden />}
          {copy.label}
        </span>
      </header>

      <section className="mr-scoreboard">
        {match.status === "VERIFIED" ? (
          <div className="mr-final">
            <span>{match.homeScore}</span>
            <span className="mr-dash" aria-hidden>
              –
            </span>
            <span>{match.awayScore}</span>
          </div>
        ) : (
          <div className="mr-final mr-final-empty" aria-label="No confirmed score yet">
            <span>–</span>
            <span className="mr-dash" aria-hidden>
              :
            </span>
            <span>–</span>
          </div>
        )}
        <p className="mr-next">{copy.next}</p>
      </section>

      {canReport && (
        <section className="mr-panel">
          <h2>Report the result</h2>
          <p className="mr-hint">
            Enter the final score. Your opponent reports separately — the result
            only counts if you both submit the same score.
          </p>
          <ReportForm
            matchId={match.id}
            homeName={match.home.displayName}
            awayName={match.away.displayName}
            uploadsEnabled={proofStorage.capabilities.uploads}
          />
        </section>
      )}

      {isPlayer && mine && (
        <section className="mr-panel">
          <h2>Your report</h2>
          <p className="mr-yours">
            You reported <strong>{mine.homeScore}–{mine.awayScore}</strong> on{" "}
            {mine.submittedAt.toLocaleString()}.
          </p>
          {match.status === "AWAITING" && (
            <p className="mr-hint">
              Waiting on {match.homeUserId === userId
                ? match.away.displayName
                : match.home.displayName}
              . Reports can&apos;t be changed once submitted — they&apos;re
              evidence.
            </p>
          )}
        </section>
      )}

      {/* Both reports are only revealed once the match is settled or in review,
          so nobody can copy their opponent's answer. */}
      {["VERIFIED", "UNDER_REVIEW", "DISPUTED", "VOID"].includes(match.status) &&
        match.submissions.length > 0 && (
          <section className="mr-panel">
            <h2>Reports</h2>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Reported</th>
                  <th className="hide-sm">When</th>
                </tr>
              </thead>
              <tbody>
                {match.submissions.map((s) => (
                  <tr key={s.userId}>
                    <td>
                      {s.userId === match.homeUserId
                        ? match.home.displayName
                        : match.away.displayName}
                    </td>
                    <td>
                      {s.homeScore}–{s.awayScore}
                    </td>
                    <td className="hide-sm">
                      {s.submittedAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

      <section className="mr-panel">
        <h2>Evidence</h2>
        {match.proofs.length === 0 ? (
          <p className="mr-hint">No proof submitted yet.</p>
        ) : (
          <ul className="mr-proofs">
            {match.proofs.map((p) => {
              const href = safeExternalUrl(p.url);
              return (
                <li key={p.id}>
                  <span className="mr-proof-kind">
                    {p.kind === "STREAM_URL" ? "Stream" : "Screenshot"}
                  </span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                      {href}
                    </a>
                  ) : (
                    <span className="mr-hint">Unavailable link</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isPlayer && DISPUTABLE_STATES.includes(match.status) && (
        <section className="mr-panel">
          <h2>Something wrong?</h2>
          <p className="mr-hint">
            If the result doesn&apos;t reflect what happened — a disconnect, a
            rule breach, a mis-reported score — file a dispute and a reviewer
            will decide using the evidence.
          </p>
          <div style={{ marginTop: 14 }}>
            <DisputeForm matchId={match.id} />
          </div>
        </section>
      )}

      {!isPlayer && (
        <p className="mr-hint">
          You&apos;re viewing this match as a spectator.
        </p>
      )}
    </main>
  );
}
