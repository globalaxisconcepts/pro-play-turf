import type { Metadata } from "next";
import Link from "next/link";
import { PassCard } from "@/components/ui/PassCard";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { prizeBreakdown } from "@/server/leagues/prize";
import { leagueService } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Champions League",
  description: "Zero buy-in, ultimate glory. Qualify from Elite and take the crown.",
};

/** The Champions tier holds exactly one tournament per season. */
async function currentChampionsLeague() {
  if (!isDatabaseConfigured()) return null;
  const listing = await leagueService.listCurrentSeasonLeagues();
  return listing.rows.find((r) => r.tier === "CHAMPIONS") ?? null;
}

export default async function ChampionsLeaguePage() {
  const league = await currentChampionsLeague();
  const prize = league
    ? prizeBreakdown(league)
    : prizeBreakdown({
        buyInCents: 0n,
        capacity: 16,
        rakeBps: 0,
        tier: "CHAMPIONS",
      });

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Sponsor-Backed Tournament</span>
        <h1>Champions League</h1>
        <p>Zero buy-in, ultimate glory.</p>
      </header>

      <section className="cl-hero">
        <PassCard
          tier="champions"
          tierWord="Champions"
          qualifier="League Pass"
          name="Champions League Pass"
          faceValue={formatCents(prize.poolCents)}
          serial="CHA-00001"
          status="reserved"
        />
        <div className="cl-stats">
          <div className="bal-card">
            <div className="bal-k">Prize pool</div>
            <div className="bal-v">{formatCents(prize.poolCents)}</div>
          </div>
          <div className="bal-card">
            <div className="bal-k">Format</div>
            <div className="bal-v">Knockout</div>
          </div>
          <div className="bal-card">
            <div className="bal-k">Qualification</div>
            <div className="bal-v">Elite top 4</div>
          </div>
          <div className="bal-card">
            <div className="bal-k">Field</div>
            <div className="bal-v">
              {league ? `${league.spotsFilled} / ${league.capacity}` : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="cl-explainer">
        <article>
          <h2>Qualification</h2>
          <p>
            The top four finishers in the Elite division earn their place. There
            is no buy-in and no way to purchase entry — the only currency is
            where you finished.
          </p>
        </article>
        <article>
          <h2>Entry &amp; trade</h2>
          <p>
            A Champions Pass is minted for those who place. Surrender it to climb
            a division, or sell it on the marketplace — the Pass is yours to
            spend how you like.
          </p>
        </article>
        <article>
          <h2>The prize</h2>
          <p>
            The winner takes {prize.places[0]?.shareBps ? prize.places[0].shareBps / 100 : 70}% of the
            pool — {formatCents(prize.places[0]?.amountCents ?? 0n)} at a full
            field. Second and third share the rest.
          </p>
        </article>
      </section>

      {league ? (
        <Link href={`/champions-league/bracket?league=${league.id}`} className="btn btn-gold cl-cta">
          View the bracket
        </Link>
      ) : (
        <div className="empty">
          <div className="ic" aria-hidden>
            👑
          </div>
          <h3>No tournament running</h3>
          <p>
            The Champions League is drawn once the Elite division finishes its
            season. Climb the ladder and qualify.
          </p>
          <Link href="/leagues" className="btn btn-primary" style={{ marginTop: 16 }}>
            Browse leagues
          </Link>
        </div>
      )}
    </main>
  );
}
