import type { Metadata } from "next";
import Link from "next/link";
import { PassCard } from "@/components/ui/PassCard";
import { PASS_TIER, PASS_WORD, formatSerial } from "@/lib/cards";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { cardService } from "@/server/services";
import { SurrenderButton } from "./_components/SurrenderButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Store",
  description: "Your Access Passes — trade them or surrender them to rank up.",
};

export default async function StorePage() {
  const { userId } = await auth();
  const collection = isDatabaseConfigured()
    ? await cardService.collectionFor(userId)
    : [];

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Digital Assets</span>
        <h1>My Passes</h1>
        <p>
          Access Passes are minted when you finish in the top three of a league.
          Trade one for its market value, or surrender it to start next season a
          division higher.
        </p>
      </header>

      {collection.length === 0 ? (
        <div className="empty">
          <div className="ic" aria-hidden>
            🎟️
          </div>
          <h3>No Passes yet</h3>
          <p>
            Finish in the top three of any league and a Pass for that tier is
            minted to your collection automatically.
          </p>
          <Link href="/leagues" className="btn btn-primary" style={{ marginTop: 16 }}>
            Browse leagues
          </Link>
        </div>
      ) : (
        <div className="store-grid">
          {collection.map((card) => {
            const serial = formatSerial(card.cardType.tier, card.serial);
            return (
              <article key={card.id} className="store-item">
                <PassCard
                  tier={PASS_TIER[card.cardType.tier]}
                  tierWord={PASS_WORD[card.cardType.tier]}
                  qualifier={card.cardType.qualifier}
                  name={card.cardType.name}
                  faceValue={formatCents(card.cardType.faceValueCents)}
                  serial={serial}
                  status={card.status === "LISTED" ? "listed" : "owned"}
                />
                <div className="store-item-actions">
                  {card.mintedPosition && (
                    <p className="store-provenance">
                      Minted for finishing{" "}
                      {card.mintedPosition === 1
                        ? "1st"
                        : card.mintedPosition === 2
                          ? "2nd"
                          : "3rd"}
                    </p>
                  )}
                  {card.status === "OWNED" ? (
                    <SurrenderButton
                      instanceId={card.id}
                      passName={card.cardType.name}
                      serial={serial}
                    />
                  ) : (
                    <p className="mr-hint">
                      Listed on the marketplace. Cancel the listing to surrender
                      it.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
