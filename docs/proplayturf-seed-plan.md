# Pro Play Turf — Seed / Demo Data Plan

> A `prisma/seed.ts` plan so `db reset` produces a believable, fully-navigable demo on **test credits** (no real gateway). Update the seed with every slice that adds a model.

## Principles
- All money is test credits via `StubPaymentProvider` / admin grant. No real gateway.
- Every list/table in the app should have populated rows AND at least one empty-state entity to demo both.
- Data must satisfy the ledger invariant: seed balances by posting real deposit/escrow txns through `LedgerService`, never by writing `Wallet` rows directly.

## 1. Season & divisions
- One **active season** ("Season 1") + one **archived** season (to demo history) + a **scheduled** next season.
- Five divisions by tier: Amateur (t5), Intermediate (t4), Advanced (t3), Elite (t2), **Champions (t1)**.

## 2. Users (~24)
- 1 **admin**, 1 **reviewer**, ~22 **players** with realistic gamertags + platforms (PS5/Xbox/PC) and linked twitch/youtube handles.
- 1 **brand-new player** (no matches, empty wallet, empty profile) to demo empty states.
- Spread players across divisions and skill so standings look real.
- Each player wallet seeded via stub deposits (varied balances; a couple with escrow held from active league entries).

## 3. Leagues
Per division, a mix of statuses:
- One **Open/Filling** league (partial capacity) — demo Join.
- One **Live** league mid-season (fixtures in progress) — demo standings + match room.
- One **Ended** league (prizes paid) — demo results + Prize transactions.
- Buy-ins per tier: Amateur Free, Intermediate $10, Advanced $25, Elite $50; Champions Free (invite).

## 4. Matches
Across the Live/Ended leagues, seed matches in every state:
- Scheduled, Live (with a fake stream + score), Verified (agreeing scores + proof), Under Review (disagreeing scores), Disputed (with a `MatchDispute`), Voided.
- Populate standings from the verified results.

## 5. Standings
Computed from seeded verified matches, with clear promotion (top 3 green) and relegation (bottom 3 red) zones, and a Champions-qualification (Elite top 4) highlight.

## 6. Champions League
Elite top-4 marked QUALIFIED; a partially-advanced **bracket** (some rounds complete) so `/champions-league/bracket` isn't empty. $15,000 pool configured; 70% winner split ready.

## 7. Cards / Passes
- Mint Passes for recent top-3 finishers across tiers (Champions/Elite/Advanced/Intermediate) in varied statuses: OWNED, LISTED (with `CardListing` prices), RESERVED.
- At least one active **marketplace listing** so `/store` marketplace has stock, and one player with an empty collection.

## 8. Streams / VODs
- 2–3 fake **live** streams (for `/watch` Live + `/scores` live) and several **VODs** with durations/dates, linked to matches.

## 9. Notifications
For 2–3 users, seed a mix: match verified, result disputed, promotion, prize paid, card sold, league starting soon — some read, some unread (to demo the dropdown + full page + empty "all caught up" for the new user).

## 10. Ledger sanity
After seeding, run the reconciliation check: every `txnId` sums to zero and each cached `Wallet` balance equals its ledger sum. Seed fails loudly if not.

## Demo accounts to hand testers
- `admin@…` (admin console), `reviewer@…` (tribunal), `pro@…` (rich account: leagues, passes, earnings), `rookie@…` (empty states everywhere). Document credentials in the repo README (dev only).
