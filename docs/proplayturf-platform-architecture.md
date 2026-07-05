# Pro Play Turf — Platform Architecture (Full Clone)

> Pro Play Turf (proplayturf.com) — full-featured competitive 1v1 EA Sports FC platform.
> Money layer is **gateway-agnostic**: internal double-entry ledger now, real payment gateway dropped in later behind a swappable `PaymentProvider` interface.
> Target: Claude Code implementation. Format: architecture doc + vertical-slice build order.

---

## 0. Scope (full clone)

| Area | Decision |
|---|---|
| Feature set | **Full clone** — leagues + promo/relegation, Champions League, live scores, streaming/`/watch`, digital cards + marketplace/`/store`, validation tribunal |
| Platform | Web (Next.js App Router) |
| Money | Internal **double-entry ledger** is the source of truth from day one. Runs on **test credits** via a stub provider. |
| Payment gateway | **Deferred.** Real deposits/withdrawals/KYC arrive later as one isolated slice implementing `PaymentProvider`. Nothing else in the app knows or cares which gateway is live. |
| Cards | Internal ledgered asset + marketplace (blockchain/NFT is an optional later swap behind a `CardCustodian` interface). |
| Validation | Pluggable validator pipeline: score-agreement + human tribunal now; stubbed slots for future stream-AI / EA-telemetry validators. |

**Design principle:** the entire product must be fully playable end-to-end on internal test credits, with zero real payment code. The gateway is then a drop-in, not a refactor.

---

## 1. Honest constraints (unchanged realities)

1. **No official EA Sports FC match API.** Validation is evidence + adjudication (submitted score + proof + human review). The pipeline leaves an interface open for a future automated validator, but never depends on one.
2. **Real-money skill contests are legally gated.** Because the gateway is deferred, so is this — but the legal + KYC + geo work is a hard prerequisite for the gateway slice (13), not for the build. *(Not legal advice.)*
3. **The ledger must be correct before the gateway ever touches it.** Build and prove double-entry escrow on test credits first; the real gateway then only ever calls `LedgerService`, never mutates balances itself.

---

## 2. Tech stack

- **Framework:** Next.js (App Router) + TypeScript + Tailwind
- **DB:** Postgres + Prisma
- **Auth:** Clerk or NextAuth (+ geo capture)
- **Money internals:** own double-entry ledger (below). **No gateway SDK in the core.**
- **Payment gateway (later):** any provider implementing `PaymentProvider` (Stripe Connect is the likely first concrete impl)
- **Jobs:** Inngest / Trigger.dev (season-close, standings, stream polling, ledger reconciliation)
- **Cache / locks:** Redis (per-wallet locks, idempotency, rate limits)
- **Storage:** S3 / R2 (match proof, card art, VOD refs)
- **Streaming:** Twitch API + YouTube Data API

---

## 3. The payment abstraction (the key change)

Everything money-related inside the app speaks to the **ledger**. Only deposits/withdrawals/KYC cross the boundary to the outside world, and only through this interface:

```ts
interface PaymentProvider {
  readonly capabilities: { deposits: boolean; withdrawals: boolean; kyc: boolean };

  // Deposit: returns something the client can act on (redirect URL / clientSecret),
  // or for the stub, completes immediately and posts the ledger txn.
  createDeposit(input: { userId: string; amountCents: bigint }): Promise<DepositIntent>;
  handleWebhook(payload: unknown): Promise<DepositResult>;      // idempotent

  createWithdrawal(input: { userId: string; amountCents: bigint; destination?: unknown }): Promise<WithdrawalResult>;
  verifyIdentity(userId: string): Promise<KycResult>;
}
```

**v1 ships `StubPaymentProvider`:**
- `createDeposit` → auto-completes, posts `DEPOSIT` ledger txn (HOUSE→AVAILABLE). Admin can also grant test credits.
- `createWithdrawal` → marks a `Payout` as `MANUAL_PENDING` (no real transfer).
- `verifyIdentity` → no-op / manual admin flag.

**Later, `StripeConnectProvider` (or other)** implements the same interface. Swapping it in is a config change + Slice 13. No league, card, prize, or wallet code changes.

---

## 4. Domain model (Prisma sketch)

```prisma
// --- Identity ---
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  displayName  String
  role         Role    @default(PLAYER) // PLAYER | REVIEWER | ADMIN
  gamerProfile GamerProfile?
  wallet       Wallet?
  kyc          KycRecord?
  geoCountry   String?
  geoRegion    String?
  createdAt    DateTime @default(now())
}

model GamerProfile {
  id       String @id @default(cuid())
  userId   String @unique
  platform String // PSN | XBOX | PC
  gamertag String
  twitchId String?
  youtubeId String?
}

model KycRecord {
  id        String    @id @default(cuid())
  userId    String    @unique
  status    KycStatus @default(UNVERIFIED)
  provider  String?
  verifiedAt DateTime?
}

// --- Money: append-only, double-entry, gateway-independent ---
model Wallet {
  id             String @id @default(cuid())
  userId         String @unique
  availableCents BigInt @default(0)   // cache; ledger is truth
  escrowCents    BigInt @default(0)
  currency       String @default("USD")
}

model LedgerEntry {
  id          String  @id @default(cuid())
  txnId       String                    // groups legs of one transaction
  walletId    String
  bucket      Bucket                    // AVAILABLE | ESCROW | HOUSE | PRIZE_POOL
  amountCents BigInt                    // signed; sum per txnId == 0
  reason      String                    // DEPOSIT|ENTRY_HOLD|PRIZE|RAKE|PAYOUT|REFUND|CARD_BUY|CARD_SELL|MARKET_FEE
  refType     String?
  refId       String?
  createdAt   DateTime @default(now())
  @@index([walletId]) @@index([txnId])
}

// --- League engine ---
model Season      { id String @id @default(cuid()); name String; startsAt DateTime; endsAt DateTime; status SeasonStatus }
model Division    { id String @id @default(cuid()); seasonId String; tier Int; name String } // tier 1 = Champions League
model League      { id String @id @default(cuid()); divisionId String; capacity Int; buyInCents BigInt; rakeBps Int; status LeagueStatus }
model LeagueEntry { id String @id @default(cuid()); leagueId String; userId String; escrowTxnId String; status EntryStatus; joinedAt DateTime @default(now()) }
model Standing    { id String @id @default(cuid()); leagueId String; userId String; played Int; won Int; drawn Int; lost Int; gf Int; ga Int; points Int }

// --- Matches & validation ---
model Match {
  id           String  @id @default(cuid())
  leagueId     String
  homeUserId   String
  awayUserId   String
  scheduledAt  DateTime?
  homeScore    Int?
  awayScore    Int?
  status       MatchStatus // SCHEDULED|AWAITING_RESULT|SUBMITTED|UNDER_REVIEW|VERIFIED|DISPUTED|VOIDED
  submittedById String?
  streamUrl    String?
  createdAt    DateTime @default(now())
}
model MatchProof   { id String @id @default(cuid()); matchId String; userId String; kind String; url String } // SCREENSHOT|VOD|STREAM
model MatchDispute { id String @id @default(cuid()); matchId String; raisedById String; reason String; status DisputeStatus; resolvedById String? }

// --- Cards & marketplace (internal asset) ---
model CardType     { id String @id @default(cuid()); name String; rarity String; art String; supplyCap Int? }
model CardInstance { id String @id @default(cuid()); cardTypeId String; serial Int; ownerId String?; mintedFrom String?; status CardStatus } // OWNED|LISTED|BURNED
model CardListing  { id String @id @default(cuid()); cardInstanceId String; sellerId String; priceCents BigInt; status ListingStatus }
model CardTxn      { id String @id @default(cuid()); cardInstanceId String; fromId String?; toId String?; kind String; priceCents BigInt?; feeCents BigInt? } // MINT|BUY|SELL|BURN

// --- Payouts (routed through PaymentProvider later) ---
model Payout   { id String @id @default(cuid()); userId String; amountCents BigInt; status PayoutStatus; providerRef String?; heldUntil DateTime? }
model AuditLog { id String @id @default(cuid()); actorId String?; action String; targetType String; targetId String; meta Json; createdAt DateTime @default(now()) }
```

**Invariants:** every money movement = one `txnId` whose signed entries sum to zero; `Wallet` balances are caches; only `LedgerService.post()` (Redis-locked per wallet) mutates balances; all provider webhooks idempotent. Card purchases, prize payouts, and marketplace fees are all just ledger txns — identical machinery whether the gateway is live or stubbed.

---

## 5. Subsystems

**Auth & profile** — signup → verify → link gamertag + streaming → geo capture. KYC only gates real withdrawals (Slice 13), so it's a no-op until the gateway exists.

**Ledger / Wallet** — double-entry service; deposits (via provider) credit AVAILABLE; league entry AVAILABLE→ESCROW; settle ESCROW→PRIZE_POOL→winners (minus rake→HOUSE); card trades move AVAILABLE between users (minus MARKET_FEE→HOUSE).

**League engine** — browse by division, join (escrow), schedule generation, standings recompute on VERIFIED result, season-close job settles pools + applies promotion/relegation + opens next season.

**Validation pipeline** — ordered validators: `AgreementValidator` (matching submissions → VERIFIED), else `HumanReviewValidator` (tribunal queue). Interface leaves slots for future `StreamAIValidator` / `EATelemetryValidator` without touching match code.

**Cards & marketplace** — mint on top-3 placement; "surrender to rank up" = burn a card for a promotion perk; `/store` marketplace: list/buy/sell using internal balance, fee to HOUSE. Custody behind a `CardCustodian` interface so a blockchain impl can replace the internal ledger later.

**Streaming** — link Twitch/YouTube, poll live status (job), embed on `/watch`, live scoreboard `/scores`, VOD refs as proof.

**Admin / tribunal** — review queue, disputes, void/adjust, season/division/league config, card-type config, payout approvals, KYC/ban, full AuditLog.

---

## 6. Page surface (full clone)

Public: `/`, `/how-it-works`, `/leagues`, `/scores`, `/champions-league` + `/champions-league/bracket`, `/watch`, `/store`, `/rules`, `/terms`, `/privacy`, `/support`, `/signin`, `/signup`.
Authed: `/dashboard`, `/wallet`, `/leagues/[id]`, `/matches/[id]`, `/store` (owned + market), `/profile`.
Admin: `/admin/reviews`, `/admin/disputes`, `/admin/seasons`, `/admin/cards`, `/admin/payouts`, `/admin/users`.

---

## 7. Build plan — vertical slices

Every slice ships end-to-end on **test credits**. The real gateway is Slice 13.

**Slice 0 — Foundations.** Next.js + TS + Tailwind + Prisma + Postgres + Redis + job runner + CI + base layout/nav.
**Slice 1 — Auth + profile + gamertag + geo.** Register, verify, link accounts, capture region.
**Slice 2 — Ledger + Wallet + PaymentProvider(Stub).** Double-entry `LedgerService` (Redis-locked), `PaymentProvider` interface + `StubPaymentProvider`, admin test-credit grant, `/wallet` balance + history. *Highest-correctness slice.*
**Slice 3 — Seasons/divisions/leagues scaffolding + browse.** Admin config; `/leagues` by division.
**Slice 4 — Join league (escrow).** AVAILABLE→ESCROW atomic; capacity + double-join guards; pre-start refund.
**Slice 5 — Fixtures + submit result + proof.** Schedule gen, `/matches/[id]` submit + proof upload.
**Slice 6 — Validation pipeline + tribunal + disputes.** Agreement auto-verify; human review queue; dispute flow; AuditLog.
**Slice 7 — Standings + season close.** Standings engine; season-close job → settle + promote/relegate + open next.
**Slice 8 — Prize pools.** Distribute top-3 minus rake→HOUSE into winners' AVAILABLE (still internal credits).
**Slice 9 — Cards + minting.** CardType/Instance, mint on placement, "surrender to rank up" burn, owned view.
**Slice 10 — Marketplace `/store`.** List/buy/sell via internal balance, MARKET_FEE→HOUSE, `CardCustodian` interface.
**Slice 11 — Streaming `/watch` + `/scores`.** Live-status polling, embeds, live scoreboard.
**Slice 12 — Champions League.** Top-division bracket + `/champions-league/bracket`.
**Slice 13 — Payment gateway (the deferred piece).** Implement real `PaymentProvider` (deposits + withdrawals + KYC + idempotent webhooks) + KYC gate + hold periods + velocity limits + geo enforcement. Flip config from Stub → real. **No other subsystem changes.**
**Slice 14 — Hardening + legal gates.** Fraud rules, ledger reconciliation job, terms/age-gate, rate limits, admin polish.

---

## 8. First three Claude Code prompts

1. *"Slice 2: Prisma schema for User/Wallet/LedgerEntry + a Redis-locked double-entry `LedgerService.post()` asserting every txn sums to zero, plus a `PaymentProvider` interface and a `StubPaymentProvider` whose `createDeposit` auto-completes a HOUSE→AVAILABLE deposit txn. Unit tests included."*
2. *"Add `/wallet`: balance + paginated ledger history, and an admin 'grant test credits' action that posts a deposit txn through StubPaymentProvider."*
3. *"Slice 4: league join that atomically moves AVAILABLE→ESCROW via LedgerService with capacity and double-join guards and a pre-start refund path."*

---

## 9. Why this ordering serves "gateway later"

Because the internal economy is a self-contained double-entry ledger and the only outside-world money crosses a single interface, you can build, demo, and QA the entire clone — leagues, prizes, cards, marketplace, Champions League — on test credits. When you're ready, the payment gateway is one isolated slice with a well-defined contract, and the legal/KYC/geo prerequisites attach to that slice alone.
