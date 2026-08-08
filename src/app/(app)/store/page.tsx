import type { Metadata } from "next";
import Link from "next/link";
import { PassCard } from "@/components/ui/PassCard";
import { PASS_TIER, PASS_WORD, formatSerial } from "@/lib/cards";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { cardService, marketService, walletService } from "@/server/services";
import {
  BuyButton,
  CancelListingButton,
  ListButton,
} from "./_components/MarketActions";
import { SurrenderButton } from "./_components/SurrenderButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Store",
  description: "Your Access Passes — trade them or surrender them to rank up.",
};

const MARKET_FEE_BPS = 500;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = raw === "market" ? "market" : "mine";

  const { userId } = await auth();
  const ready = isDatabaseConfigured();
  const [collection, listings, balances] = await Promise.all([
    ready ? cardService.collectionFor(userId) : [],
    ready ? marketService.listActive() : [],
    ready ? walletService.getBalances(userId) : null,
  ]);

  const available = balances?.availableCents ?? 0n;
  const myListingByCard = new Map(
    listings
      .filter((l) => l.sellerUserId === userId)
      .map((l) => [l.cardInstance.id, l.id]),
  );
  const forSale = listings.filter((l) => l.sellerUserId !== userId);

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Digital Assets</span>
        <h1>Store</h1>
        <p>
          Access Passes are minted when you finish in the top three of a league.
          Trade one for what the market will pay, or surrender it to start next
          season a division higher.
        </p>
      </header>

      <nav className="lg-tabs" aria-label="Store sections">
        <Link
          href="/store"
          className="lg-tab"
          aria-current={tab === "mine" ? "page" : undefined}
        >
          My Passes ({collection.length})
        </Link>
        <Link
          href="/store?tab=market"
          className="lg-tab"
          aria-current={tab === "market" ? "page" : undefined}
        >
          Marketplace ({forSale.length})
        </Link>
      </nav>

      <section className="lg-tab-panel">
        {tab === "mine" ? (
          collection.length === 0 ? (
            <div className="empty">
              <div className="ic" aria-hidden>
                🎟️
              </div>
              <h3>No Passes yet</h3>
              <p>
                Finish in the top three of any league and a Pass for that tier is
                minted to your collection automatically.
              </p>
              <Link
                href="/leagues"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
              >
                Browse leagues
              </Link>
            </div>
          ) : (
            <div className="store-grid">
              {collection.map((card) => {
                const serial = formatSerial(card.cardType.tier, card.serial);
                const listingId = myListingByCard.get(card.id);
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
                      {card.status === "LISTED" && listingId ? (
                        <CancelListingButton listingId={listingId} />
                      ) : (
                        <>
                          <ListButton
                            instanceId={card.id}
                            passName={card.cardType.name}
                            feeBps={MARKET_FEE_BPS}
                          />
                          <SurrenderButton
                            instanceId={card.id}
                            passName={card.cardType.name}
                            serial={serial}
                          />
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : forSale.length === 0 ? (
          <div className="empty">
            <div className="ic" aria-hidden>
              🏷️
            </div>
            <h3>Nothing for sale right now</h3>
            <p>
              When players list their Passes they show up here. Check back, or
              earn one of your own in a league.
            </p>
          </div>
        ) : (
          <div className="store-grid">
            {forSale.map((listing) => {
              const card = listing.cardInstance;
              const serial = formatSerial(card.cardType.tier, card.serial);
              return (
                <article key={listing.id} className="store-item">
                  <PassCard
                    tier={PASS_TIER[card.cardType.tier]}
                    tierWord={PASS_WORD[card.cardType.tier]}
                    qualifier={card.cardType.qualifier}
                    name={card.cardType.name}
                    faceValue={formatCents(card.cardType.faceValueCents)}
                    serial={serial}
                    status="listed"
                  />
                  <div className="store-item-actions">
                    <p className="store-provenance">
                      Sold by {listing.seller.displayName}
                    </p>
                    <BuyButton
                      listingId={listing.id}
                      passName={card.cardType.name}
                      priceLabel={formatCents(listing.priceCents)}
                      availableLabel={formatCents(available)}
                      canAfford={available >= listing.priceCents}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
