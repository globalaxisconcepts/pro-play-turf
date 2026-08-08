import type { Metadata } from "next";
import Link from "next/link";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { bucketMatches } from "@/server/matches/scores";

// Scores change constantly; never serve a cached board.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Scores",
  description: "Live, upcoming and completed matches across every league.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const SEGMENTS = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const;

type Segment = (typeof SEGMENTS)[number]["key"];

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.seg) ? sp.seg[0] : sp.seg;
  const segment: Segment = SEGMENTS.some((s) => s.key === raw)
    ? (raw as Segment)
    : "live";

  const matches = isDatabaseConfigured()
    ? await prisma.match.findMany({
        orderBy: [{ verifiedAt: "desc" }, { round: "asc" }],
        take: 200,
        select: {
          id: true,
          status: true,
          round: true,
          homeScore: true,
          awayScore: true,
          league: { select: { name: true } },
          home: { select: { displayName: true } },
          away: { select: { displayName: true } },
        },
      })
    : [];

  const buckets = bucketMatches(matches);
  const shown = buckets[segment];

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Scoreboard</span>
        <h1>Scores</h1>
        <p>
          Every match across the platform. A score only appears once both players
          have reported the same result — anything under review stays off the
          board until it&apos;s settled.
        </p>
      </header>

      <nav className="lg-tabs" aria-label="Score segments">
        {SEGMENTS.map((s) => (
          <Link
            key={s.key}
            href={`/scores?seg=${s.key}`}
            className="lg-tab"
            aria-current={s.key === segment ? "page" : undefined}
          >
            {s.label} ({buckets[s.key].length})
          </Link>
        ))}
      </nav>

      <section className="lg-tab-panel">
        {shown.length === 0 ? (
          <div className="empty">
            <div className="ic" aria-hidden>
              {segment === "live" ? "📡" : segment === "upcoming" ? "📅" : "🏁"}
            </div>
            <h3>
              {segment === "live"
                ? "No matches in progress"
                : segment === "upcoming"
                  ? "Nothing scheduled yet"
                  : "No completed matches yet"}
            </h3>
            <p>
              {segment === "live"
                ? "Check the upcoming tab for what's next."
                : "Fixtures appear here once a league kicks off."}
            </p>
          </div>
        ) : (
          <ol className="lg-fixtures">
            {shown.map((m) => (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="lg-fixture">
                  <span className="lg-fixture-round">R{m.round}</span>
                  <span className="lg-fixture-teams">
                    <span>{m.home.displayName}</span>
                    <span className="lg-fixture-score">
                      {m.status === "VERIFIED"
                        ? `${m.homeScore}–${m.awayScore}`
                        : "vs"}
                    </span>
                    <span>{m.away.displayName}</span>
                  </span>
                  <span className="sc-league">{m.league.name}</span>
                  <span className="lg-badge" data-status={m.status}>
                    {m.status === "LIVE" && <span className="lg-dot" aria-hidden />}
                    {m.status === "AWAITING" ? "Reporting" : m.status}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
