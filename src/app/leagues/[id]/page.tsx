import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { STATUS_LABEL, TIER_LABEL } from "@/lib/leagues";
import { formatCents } from "@/lib/money";
import { getSession } from "@/server/auth";
import { prizeBreakdown } from "@/server/leagues/prize";
import { projectedPoolCents, spotsLeft } from "@/server/leagues/types";
import {
  leagueService,
  matchService,
  seasonService,
  walletService,
} from "@/server/services";
import { JoinPanel, type JoinAvailability } from "./_components/JoinPanel";

export const dynamic = "force-dynamic";

/** Short fixture-list labels for each match state. */
const STATUS_COPY: Record<string, string> = {
  SCHEDULED: "To play",
  LIVE: "Live",
  AWAITING: "Awaiting",
  VERIFIED: "Verified",
  UNDER_REVIEW: "In review",
  DISPUTED: "Disputed",
  VOID: "Void",
};

const TABS = [
  { key: "standings", label: "Standings" },
  { key: "fixtures", label: "Fixtures" },
  { key: "prize", label: "Prize Breakdown" },
  { key: "rules", label: "Rules" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type SearchParams = Record<string, string | string[] | undefined>;

function toTab(sp: SearchParams): TabKey {
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return TABS.some((t) => t.key === raw) ? (raw as TabKey) : "standings";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isDatabaseConfigured()) return { title: "League" };
  // Metadata must never break the page — a lookup failure just falls back.
  const row = await leagueService.getLeague(id).catch(() => null);
  return { title: row ? row.name : "League" };
}

export default async function LeagueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // No database yet → no leagues exist, so this really is a 404. A failure with
  // a database wired is a genuine error and belongs to the error boundary.
  if (!isDatabaseConfigured()) notFound();

  const row = await leagueService.getLeague(id);
  if (!row) notFound();

  const tab = toTab(sp);
  const session = await getSession();
  const [entry, balances, entrants, fixtures, standings] = await Promise.all([
    session ? leagueService.entryFor(id, session.userId) : null,
    session ? walletService.getBalances(session.userId) : null,
    leagueService.entrants(id),
    matchService.listFixtures(id),
    seasonService.standingsFor(id),
  ]);

  // Actual payouts, once the league has been settled. Read from the ledger
  // rather than recomputed, so what's shown is what was really paid.
  const settled = await leagueService.payoutsFor(id);

  const isFree = row.buyInCents === 0n;
  const open = row.status === "OPEN" || row.status === "FILLING";
  const left = spotsLeft(row);
  const prize = prizeBreakdown(row);

  let availability: JoinAvailability;
  if (!session) availability = "signed-out";
  else if (entry) availability = "entered";
  else if (!open) availability = "closed";
  else if (left <= 0) availability = "full";
  else availability = "joinable";

  const fillPct =
    row.capacity > 0
      ? Math.min(100, Math.round((row.spotsFilled / row.capacity) * 100))
      : 0;

  return (
    <main className="app-main">
      <Link href="/leagues" className="lg-back">
        ← All leagues
      </Link>

      <header className="lg-detail-head">
        <div>
          <span className="eyebrow">
            {TIER_LABEL[row.tier]} · {row.divisionName}
          </span>
          <h1>{row.name}</h1>
        </div>
        <span className="lg-badge" data-status={row.status}>
          {row.status === "LIVE" && <span className="lg-dot" aria-hidden />}
          {STATUS_LABEL[row.status]}
        </span>
      </header>

      <div className="lg-detail-stats">
        <div className="bal-card">
          <div className="bal-k">Buy-in</div>
          <div className="bal-v">
            {isFree ? "Free" : formatCents(row.buyInCents)}
          </div>
        </div>
        <div className="bal-card">
          <div className="bal-k">Prize pool</div>
          <div className="bal-v">{formatCents(projectedPoolCents(row))}</div>
        </div>
        <div className="bal-card">
          <div className="bal-k">Spots</div>
          <div className="bal-v">
            {row.spotsFilled} / {row.capacity}
          </div>
        </div>
      </div>

      <section className="lg-detail-join">
        <div className="lg-cap">
          <div className="lg-cap-row">
            <span>
              {row.spotsFilled} / {row.capacity} players
            </span>
            <span>{left} open</span>
          </div>
          <div className="lg-cap-track" aria-hidden>
            <div className="lg-cap-fill" style={{ width: `${fillPct}%` }} />
          </div>
        </div>
        <JoinPanel
          leagueId={row.id}
          leagueName={row.name}
          availability={availability}
          isFree={isFree}
          buyInLabel={formatCents(row.buyInCents)}
          availableLabel={formatCents(balances?.availableCents ?? 0n)}
          canAfford={(balances?.availableCents ?? 0n) >= row.buyInCents}
          refundable={open}
        />
      </section>

      <nav className="lg-tabs" aria-label="League sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/leagues/${row.id}?tab=${t.key}`}
            className="lg-tab"
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="lg-tab-panel">
        {tab === "standings" && (
          <>
            {entrants.length === 0 ? (
              <div className="empty">
                <div className="ic" aria-hidden>
                  🏁
                </div>
                <h3>No one has entered yet</h3>
                <p>Be the first to take a spot in this league.</p>
              </div>
            ) : (
              <>
                <p className="lg-panel-note">
                  3 points for a win, 1 for a draw. Ranked on points, then goal
                  difference, then goals scored. Only verified results count —
                  a voided match leaves no trace here.
                </p>
                <table className="tx-table lg-standings">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>P</th>
                      <th className="hide-sm">W</th>
                      <th className="hide-sm">D</th>
                      <th className="hide-sm">L</th>
                      <th className="hide-sm">GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr
                        key={row.userId}
                        data-you={row.userId === session?.userId || undefined}
                        data-zone={zoneOf(row.position, standings.length)}
                      >
                        <td>{row.position}</td>
                        <td>
                          {row.displayName}
                          {row.userId === session?.userId && (
                            <span className="lg-you">You</span>
                          )}
                        </td>
                        <td>{row.played}</td>
                        <td className="hide-sm">{row.won}</td>
                        <td className="hide-sm">{row.drawn}</td>
                        <td className="hide-sm">{row.lost}</td>
                        <td className="hide-sm">
                          {row.goalDifference > 0 ? "+" : ""}
                          {row.goalDifference}
                        </td>
                        <td>
                          <strong>{row.points}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="lg-zone-key">
                  <span className="lg-zone-dot" data-zone="promotion" /> Top 3
                  promote
                  <span className="lg-zone-dot" data-zone="relegation" /> Bottom
                  3 relegate
                </p>
              </>
            )}
          </>
        )}

        {tab === "fixtures" &&
          (fixtures.length === 0 ? (
            <div className="empty">
              <div className="ic" aria-hidden>
                📅
              </div>
              <h3>Fixtures aren&apos;t scheduled yet</h3>
              <p>
                The schedule is generated once the league fills and kicks off.
                You&apos;ll be notified when your first match is set.
              </p>
            </div>
          ) : (
            <ol className="lg-fixtures">
              {fixtures.map((f) => (
                <li key={f.id}>
                  <Link href={`/matches/${f.id}`} className="lg-fixture">
                    <span className="lg-fixture-round">R{f.round}</span>
                    <span className="lg-fixture-teams">
                      <span
                        data-you={f.homeUserId === session?.userId || undefined}
                      >
                        {f.home.displayName}
                      </span>
                      <span className="lg-fixture-score">
                        {f.status === "VERIFIED"
                          ? `${f.homeScore}–${f.awayScore}`
                          : "vs"}
                      </span>
                      <span
                        data-you={f.awayUserId === session?.userId || undefined}
                      >
                        {f.away.displayName}
                      </span>
                    </span>
                    <span className="lg-badge" data-status={f.status}>
                      {STATUS_COPY[f.status] ?? f.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ))}

        {tab === "prize" && (
          <>
            {settled.length > 0 ? (
              <>
                <p className="lg-panel-note">
                  Final payouts. The pool was what entrants actually paid in, so
                  a league that didn&apos;t fill paid out less than advertised.
                </p>
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Place</th>
                      <th>Player</th>
                      <th>Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settled.map((s) => (
                      <tr
                        key={s.userId}
                        data-you={s.userId === session?.userId || undefined}
                      >
                        <td>{ordinal(s.position)}</td>
                        <td>{s.displayName}</td>
                        <td className="gold">{formatCents(s.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
            <p className="lg-panel-note" style={{ marginTop: settled.length ? 28 : 0 }}>
              {settled.length > 0 ? "Advertised split — " : ""}Projected at full
              capacity ({row.capacity} players
              {isFree ? "" : ` × ${formatCents(row.buyInCents)}`}).
            </p>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Share</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {prize.places.map((p) => (
                  <tr key={p.place}>
                    <td>{ordinal(p.place)}</td>
                    <td>{p.shareBps / 100}%</td>
                    <td className="gold">{formatCents(p.amountCents)}</td>
                  </tr>
                ))}
                <tr>
                  <td>House rake</td>
                  <td>{row.rakeBps / 100}%</td>
                  <td>{formatCents(prize.rakeCents)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {tab === "rules" && (
          <div className="lg-rules">
            <h3>How this league works</h3>
            <ul>
              <li>
                <strong>Entry.</strong>{" "}
                {isFree
                  ? "This league is free to enter."
                  : `Your ${formatCents(row.buyInCents)} buy-in is held in escrow — not spent — from the moment you join.`}
              </li>
              <li>
                <strong>Withdrawing.</strong> You can withdraw any time before
                the league starts and your buy-in is returned in full. Once it
                goes live, entries are locked.
              </li>
              <li>
                <strong>Format.</strong> {row.capacity} players, one match
                against each opponent. Results are reported by both players with
                proof, and disagreements go to human review.
              </li>
              <li>
                <strong>Payouts.</strong> The top three share the pool
                {row.rakeBps > 0 && ` after a ${row.rakeBps / 100}% house rake`};
                see the Prize Breakdown tab.
              </li>
              <li>
                <strong>Promotion &amp; relegation.</strong> The top finishers
                move up a division next season; the bottom finishers move down.
              </li>
              <li>
                <strong>Fair play.</strong> Zero tolerance for cheating,
                smurfing, or result-fixing. Confirmed breaches forfeit the entry.
              </li>
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

/** Promotion/relegation shading, matching the "top 3 up, bottom 3 down" promise. */
function zoneOf(position: number, size: number): string | undefined {
  const band = Math.min(3, Math.floor(size / 2));
  if (band === 0) return undefined;
  if (position <= band) return "promotion";
  if (position > size - band) return "relegation";
  return undefined;
}

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
