import type { Metadata } from "next";
import Link from "next/link";
import { safeExternalUrl } from "@/lib/urls";
import { reviewService } from "@/server/services";
import { resolveMatchAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Reviews" };

export default async function AdminReviewsPage() {
  const queue = await reviewService.listQueue();

  return (
    <div className="admin-page">
      <h1>Review queue</h1>
      <p className="admin-sub">
        Matches where the two reports disagree, or that a player has formally
        contested. Every decision here is written to the audit log against your
        account.
      </p>

      {queue.length === 0 ? (
        <div className="empty">
          <div className="ic" aria-hidden>
            ✅
          </div>
          <h3>Nothing to review</h3>
          <p>Every match so far has been settled by the players themselves.</p>
        </div>
      ) : (
        <div className="rv-queue">
          {queue.map((m) => {
            const homeReport = m.submissions.find((s) => s.userId === m.homeUserId);
            const awayReport = m.submissions.find((s) => s.userId === m.awayUserId);
            return (
              <article key={m.id} className="rv-case">
                <header className="rv-case-head">
                  <div>
                    <span className="eyebrow">
                      {m.league.name} · Round {m.round}
                    </span>
                    <h2>
                      {m.home.displayName} vs {m.away.displayName}
                    </h2>
                  </div>
                  <span className="lg-badge" data-status={m.status}>
                    {m.status === "DISPUTED" ? "Disputed" : "In review"}
                  </span>
                </header>

                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{m.home.displayName} (home)</td>
                      <td>
                        {homeReport
                          ? `${homeReport.homeScore}–${homeReport.awayScore}`
                          : "— no report —"}
                      </td>
                    </tr>
                    <tr>
                      <td>{m.away.displayName} (away)</td>
                      <td>
                        {awayReport
                          ? `${awayReport.homeScore}–${awayReport.awayScore}`
                          : "— no report —"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {m.disputes.length > 0 && (
                  <div className="rv-disputes">
                    <h3>Disputes</h3>
                    <ul>
                      {m.disputes.map((d) => (
                        <li key={d.id}>
                          <strong>
                            {d.raisedByUserId === m.homeUserId
                              ? m.home.displayName
                              : m.away.displayName}
                            :
                          </strong>{" "}
                          {d.reason}
                          {safeExternalUrl(d.evidenceUrl) && (
                            <>
                              {" — "}
                              <a
                                href={safeExternalUrl(d.evidenceUrl)!}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                              >
                                evidence
                              </a>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rv-proofs">
                  <h3>Evidence</h3>
                  {m.proofs.length === 0 ? (
                    <p className="admin-empty">Neither player submitted proof.</p>
                  ) : (
                    <ul>
                      {m.proofs.map((p) => {
                        const href = safeExternalUrl(p.url);
                        return (
                          <li key={p.id}>
                            <span className="mr-proof-kind">
                              {p.userId === m.homeUserId
                                ? m.home.displayName
                                : m.away.displayName}
                            </span>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                              >
                                {href}
                              </a>
                            ) : (
                              <span className="admin-empty">Unavailable link</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <form action={resolveMatchAction} className="rv-decide">
                  <input type="hidden" name="matchId" value={m.id} />
                  <div className="rv-score-inputs">
                    <label className="field-label">
                      Home
                      <input
                        name="homeScore"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={homeReport?.homeScore ?? 0}
                      />
                    </label>
                    <label className="field-label">
                      Away
                      <input
                        name="awayScore"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={homeReport?.awayScore ?? 0}
                      />
                    </label>
                  </div>
                  <label className="field-label">
                    Note (recorded in the audit log)
                    <input name="note" maxLength={500} placeholder="Reasoning…" />
                  </label>
                  <div className="rv-actions">
                    <button
                      type="submit"
                      name="decision"
                      value="VERIFY"
                      className="btn btn-primary"
                    >
                      Verify with this score
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="VOID"
                      className="btn btn-ghost"
                    >
                      Void match
                    </button>
                  </div>
                </form>

                <Link href={`/matches/${m.id}`} className="rv-link">
                  Open Match Room →
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
