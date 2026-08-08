import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { STATUS_LABEL, TIER_LABEL } from "@/lib/leagues";
import { leagueService } from "@/server/services";
import { projectedPoolCents, spotsLeft } from "@/server/leagues/types";

export const dynamic = "force-dynamic";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // No database yet → no leagues exist, so this really is a 404. A failure with
  // a database wired is a genuine error and belongs to the error boundary.
  if (!isDatabaseConfigured()) notFound();
  const row = await leagueService.getLeague(id);
  if (!row) notFound();

  const isFree = row.buyInCents === 0n;

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
            {spotsLeft(row)} / {row.capacity}
          </div>
        </div>
      </div>

      <div className="wallet-notice">
        <span className="wallet-notice-ic" aria-hidden>
          ✨
        </span>
        <div>
          <strong>Joining opens shortly.</strong> Standings, fixtures, and the
          buy-in flow are being wired up for this league.
        </div>
      </div>
    </main>
  );
}
