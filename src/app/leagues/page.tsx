import type { Metadata } from "next";
import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db";
import { TIER_LABEL } from "@/lib/leagues";
import { leagueService } from "@/server/services";
import { groupByDivision, selectLeagues } from "@/server/leagues/select";
import type { LeagueCriteria } from "@/server/leagues/types";
import type { SeasonListing } from "@/server/leagues/league-service";
import { FilterBar } from "./_components/FilterBar";
import { LeagueCard } from "./_components/LeagueCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Leagues",
  description: "Browse open EA Sports FC leagues and buy in.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Map URL query into the pure selector's criteria. */
function toCriteria(sp: SearchParams): LeagueCriteria {
  const tier = one(sp.tier);
  const status = one(sp.status);
  const buyin = one(sp.buyin);
  const sort = one(sp.sort);

  const c: LeagueCriteria = {
    tier: (tier as LeagueCriteria["tier"]) ?? "all",
    status: (status as LeagueCriteria["status"]) ?? "all",
    search: one(sp.q),
    sort: (sort as LeagueCriteria["sort"]) ?? "prize",
  };

  // Buy-in preset → entry / range filters.
  if (buyin === "free") c.entry = "free";
  else if (buyin === "low") {
    c.entry = "paid";
    c.maxBuyInCents = 2_500n;
  } else if (buyin === "high") {
    c.minBuyInCents = 2_500n;
  }

  return c;
}

function daysLeft(endsAt: Date | null): number | null {
  if (!endsAt) return null;
  const ms = endsAt.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const criteria = toCriteria(sp);

  // Before Postgres is wired there are no league tables to read — that's the
  // soft "opening soon" state, not a failure. Once it IS wired, a query error
  // is a real error: let it reach error.tsx rather than faking an empty season.
  const listing: SeasonListing = isDatabaseConfigured()
    ? await leagueService.listCurrentSeasonLeagues()
    : { season: null, rows: [] };
  const { season } = listing;

  const rows = selectLeagues(listing.rows, criteria);
  const groups = groupByDivision(rows);
  const remaining = daysLeft(season?.endsAt ?? null);

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">{season ? season.name : "Leagues"}</span>
        <h1>Find Your League</h1>
        <p>
          Browse open divisions, buy in, and climb the ladder — promotion,
          relegation, and top-3 payouts every season.
        </p>
        {season && remaining !== null && (
          <div className="lg-season-strip">
            <span className="lg-live-tag">{season.status}</span>
            <span>
              {remaining > 0
                ? `Season ends in ${remaining} day${remaining === 1 ? "" : "s"}`
                : "Season ending soon"}
            </span>
          </div>
        )}
      </header>

      {season && listing.rows.length > 0 && <FilterBar />}

      {!season ? (
        <div className="empty">
          <div className="ic" aria-hidden>
            🏟️
          </div>
          <h3>Leagues open soon</h3>
          <p>The next season is being set up. Check back shortly.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <div className="ic" aria-hidden>
            🔍
          </div>
          <h3>No leagues match your filters</h3>
          <p>Try widening your search.</p>
          <Link href="/leagues" className="btn btn-ghost" style={{ marginTop: 16 }}>
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="lg-divisions">
          {groups.map((group) => (
            <section
              key={group.divisionId}
              className="lg-division"
              aria-labelledby={`division-${group.divisionId}`}
            >
              <div className="lg-division-head" data-tier={group.tier}>
                <h2 id={`division-${group.divisionId}`}>{group.divisionName}</h2>
                <span className="lg-division-tier">{TIER_LABEL[group.tier]}</span>
                <span className="lg-division-count">
                  {group.rows.length} league{group.rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="lg-grid">
                {group.rows.map((row) => (
                  <LeagueCard key={row.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
