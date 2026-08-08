import Link from "next/link";
import { formatCents } from "@/lib/money";
import { STATUS_LABEL, TIER_LABEL } from "@/lib/leagues";
import type { LeagueRow } from "@/server/leagues/types";
import { projectedPoolCents, spotsLeft } from "@/server/leagues/types";

/** One League Card in the browse grid. Server-rendered; no client JS. */
export function LeagueCard({ row }: { row: LeagueRow }) {
  const isFree = row.buyInCents === 0n;
  const pool = projectedPoolCents(row);
  const left = spotsLeft(row);
  const fillPct =
    row.capacity > 0
      ? Math.min(100, Math.round((row.spotsFilled / row.capacity) * 100))
      : 0;
  const isChampions = row.tier === "CHAMPIONS";

  return (
    <article className="lg-card" data-tier={row.tier} data-status={row.status}>
      <div className="lg-card-top">
        <span className="lg-tier">{TIER_LABEL[row.tier]}</span>
        <span className="lg-badge" data-status={row.status}>
          {row.status === "LIVE" && <span className="lg-dot" aria-hidden />}
          {STATUS_LABEL[row.status]}
        </span>
      </div>

      <h3 className="lg-name">{row.name}</h3>
      <p className="lg-div">{row.divisionName}</p>

      <div className="lg-stats">
        <div className="lg-stat">
          <span className="lg-k">Buy-in</span>
          <span className={`lg-v ${isFree ? "free" : "gold"}`}>
            {isFree ? "Free" : formatCents(row.buyInCents)}
          </span>
        </div>
        <div className="lg-stat">
          <span className="lg-k">Prize pool</span>
          <span className="lg-v gold">{formatCents(pool)}</span>
        </div>
      </div>

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

      <p className="lg-promo">
        {isChampions
          ? "Apex tier · invite only"
          : "▲ Top 3 promote · ▼ Bottom 3 relegate"}
      </p>

      <Link href={`/leagues/${row.id}`} className="btn btn-primary lg-cta">
        View League
      </Link>
    </article>
  );
}
