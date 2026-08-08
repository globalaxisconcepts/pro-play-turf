import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { bracketService, leagueService } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Champions League · Bracket" };

type SearchParams = Record<string, string | string[] | undefined>;

/** A round's name depends on how far it is from the final. */
function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isDatabaseConfigured()) notFound();
  const sp = await searchParams;
  const leagueId = Array.isArray(sp.league) ? sp.league[0] : sp.league;

  const league = leagueId ? await leagueService.getLeague(leagueId) : null;
  if (!league || league.tier !== "CHAMPIONS") notFound();

  const [rounds, placings] = await Promise.all([
    bracketService.bracketFor(league.id),
    bracketService.placements(league.id),
  ]);
  const payouts = await leagueService.payoutsFor(league.id);
  const champion = placings[0];

  return (
    <main className="app-main">
      <Link href="/champions-league" className="lg-back">
        ← Champions League
      </Link>

      <header className="lg-head">
        <span className="eyebrow">{league.name}</span>
        <h1>Bracket</h1>
        <p>
          Single knockout. A tie only advances once both players have reported
          the same decisive score — a draw or a match under review holds the
          round open.
        </p>
      </header>

      {rounds.length === 0 ? (
        <div className="empty">
          <div className="ic" aria-hidden>
            🗓️
          </div>
          <h3>The draw hasn&apos;t been made</h3>
          <p>Qualifiers are seeded once the Elite division finishes.</p>
        </div>
      ) : (
        <>
          {champion && (
            <p className="cl-champion">
              🏆 Champion:{" "}
              <strong>
                {rounds
                  .flatMap((r) => r.matches)
                  .flatMap((m) => [
                    { id: m.homeUserId, name: m.home.displayName },
                    { id: m.awayUserId, name: m.away.displayName },
                  ])
                  .find((p) => p.id === champion)?.name ?? champion}
              </strong>
            </p>
          )}

          <div className="cl-bracket">
            {rounds.map((r) => (
              <section key={r.round} className="cl-round">
                <h2>{roundName(r.round, rounds.length)}</h2>
                <ol>
                  {r.matches.map((m) => (
                    <li key={m.id}>
                      <Link href={`/matches/${m.id}`} className="cl-tie">
                        <span
                          className="cl-side"
                          data-won={
                            m.status === "VERIFIED" &&
                            (m.homeScore ?? 0) > (m.awayScore ?? 0)
                              ? true
                              : undefined
                          }
                        >
                          {m.home.displayName}
                          <b>{m.status === "VERIFIED" ? m.homeScore : "–"}</b>
                        </span>
                        <span
                          className="cl-side"
                          data-won={
                            m.status === "VERIFIED" &&
                            (m.awayScore ?? 0) > (m.homeScore ?? 0)
                              ? true
                              : undefined
                          }
                        >
                          {m.away.displayName}
                          <b>{m.status === "VERIFIED" ? m.awayScore : "–"}</b>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          {payouts.length > 0 && (
            <section className="lg-tab-panel">
              <h2 className="cl-payout-head">Payouts</h2>
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Player</th>
                    <th>Won</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.userId}>
                      <td>{p.position}</td>
                      <td>{p.displayName}</td>
                      <td className="gold">{formatCents(p.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
