# Pro Play Turf — Build Plan (Slice-by-Slice Execution)

> The execution playbook for Claude Code. Each slice = one branch/PR. Work top to bottom.
> Read alongside `CLAUDE.md` (rules) and `proplayturf-platform-architecture.md` (domain model). Behavior/UX per the finished designs + `proplayturf-wiring-prompt.md`.

**How to run a slice:** point Claude Code at `CLAUDE.md` + the architecture doc + the relevant designed screens, paste the slice's prompt, then verify against its acceptance criteria and tests before opening the PR. One slice per PR. Don't start real payments (Slice 13) until the parallel legal/KYC/geo track is done.

---

## Slice 0 — Foundations
**Goal:** runnable skeleton.
**Prompt:**
> Scaffold a Next.js (App Router) + TypeScript (strict) + Tailwind project. Add Prisma + Postgres, Redis, and Inngest (background jobs) wired and health-checked. Set up ESLint/Prettier, env validation, a CI workflow (typecheck + test), and a base app layout with the top nav and footer from the finished design (logged-out state). Add a `money.ts` util for BigInt-cents formatting/parsing.
**Acceptance:** app builds + deploys; `prisma migrate` runs; a trivial Inngest job executes; CI passes.
**Tests:** `money.ts` round-trip (parse/format) unit tests.

## Slice 1 — Auth + profile + gamertag + geo
**Goal:** accounts and identity.
**Prompt:**
> Add auth (Clerk or NextAuth behind an `auth()` helper). Implement signup/signin/verify per the designed screens, an onboarding wizard (link EA ID, link streaming account, connection check, choose first league), a `GamerProfile` (platform, gamertag, twitch/youtube), and geo capture with a region gate blocking disallowed regions at signup.
**Acceptance:** a user registers, verifies, links accounts, completes onboarding → dashboard; blocked regions cannot sign up; protected routes redirect to signin with return-to.
**Tests:** region gate allows/blocks correctly; auth redirect on protected route.

## Slice 2 — Ledger + Wallet + PaymentProvider(Stub) ★ CRITICAL
**Goal:** correct money core on test credits.
**Prompt:**
> Implement Prisma models `User`, `Wallet`, `LedgerEntry`. Build `LedgerService.post(txn)` that writes balanced double-entry transactions (signed amounts per `txnId` sum to zero) under a Redis per-wallet lock and updates cached `Wallet.availableCents/escrowCents`. Add a `PaymentProvider` interface and `StubPaymentProvider` whose `createDeposit` auto-completes a HOUSE→AVAILABLE deposit txn; add an admin "grant test credits" action. Build the `/wallet` page (available/escrow balances + paginated ledger history) and the Deposit modal per the design. Money is BigInt cents throughout.
**Acceptance:** a stub deposit increases AVAILABLE and is backed by balanced ledger entries; `/wallet` shows balance + history; balances always equal the ledger sum.
**Tests:** every txn sums to zero; concurrent posts to one wallet don't corrupt balances (lock works); cached balance == ledger sum after N random ops; no path mutates balance outside `LedgerService`.

## Slice 3 — Seasons / divisions / leagues scaffolding + browse
**Goal:** league data + public browse.
**Prompt:**
> Add `Season`, `Division` (tier), `League` (capacity, buyInCents, rakeBps, status) models + an admin path to create them. Build `/leagues` browse with filters (division, buy-in, status, entry type), sort, and season countdown, using the designed League Cards and states (loading/empty).
**Acceptance:** admin creates a season+divisions+leagues; `/leagues` lists them by division with working filters and empty state.
**Tests:** filter/sort logic returns correct subsets.

## Slice 4 — Join league (escrow)
**Goal:** buy-in escrow.
**Prompt:**
> Implement `joinLeague`: atomically move the buy-in AVAILABLE→ESCROW via `LedgerService`, with capacity and double-join guards and a pre-start refund path that reverses the escrow. Wire the confirm modal (buy-in debit, escrow terms checkbox) and the insufficient-balance → Deposit branch. Build `/leagues/[id]` detail (header, Join, tabs: Standings/Fixtures/Prize/Rules) per design.
**Acceptance:** joining holds exactly the buy-in in ESCROW; refund restores it; capacity + double-join enforced; insufficient balance routes to deposit then back.
**Tests:** escrow amount exact; refund reverses; capacity cap; no double-join; ledger stays balanced.

## Slice 5 — Fixtures + submit result + proof
**Goal:** play + report.
**Prompt:**
> Add `Match` + `MatchProof` models and schedule generation for a league. Build the Match Room (`/matches/[id]`) per design with its states (Scheduled/Live/Submit/Awaiting/Verified/…). Implement both-players result submission with proof (screenshot upload to S3/R2 + stream URL). When both submitted scores agree → mark VERIFIED.
**Acceptance:** two agreeing submissions → VERIFIED; proof stored; match states render correctly.
**Tests:** agreement → VERIFIED; single submission stays AWAITING; proof persists.

## Slice 6 — Validation pipeline + tribunal + disputes
**Goal:** resolve disagreements.
**Prompt:**
> Build a `ResultValidator` pipeline: `AgreementValidator` (matching → VERIFIED) then `HumanReviewValidator` (mismatch/flag → UNDER_REVIEW). Add `MatchDispute` + an admin review queue (`/admin/reviews`) and dispute flow (raise with reason/evidence, reviewer verify/void), plus an append-only `AuditLog`. Leave interface slots for future stream-AI / EA validators.
**Acceptance:** disagreeing scores land in the review queue; a reviewer can verify or void; disputes are raiseable and resolvable; every action is audit-logged.
**Tests:** mismatch routes to review; void reverses standings/escrow effects; audit entries written.

## Slice 7 — Standings + season close (promotion/relegation)
**Goal:** the league lifecycle.
**Prompt:**
> Build the standings engine (recompute on each VERIFIED result) with promotion/relegation zones per design. Add a season-close Inngest job: settle open state, promote top N / relegate bottom N across divisions, archive the season, and open the next.
**Acceptance:** standings update on verified results; running season-close moves players across divisions and opens a new season.
**Tests:** standings math (points/GD/tiebreakers); promotion/relegation selects correct players; idempotent close (re-running doesn't double-apply).

## Slice 8 — Prize pools
**Goal:** pay the winners (internal credits).
**Prompt:**
> On league/season settle, distribute the pooled buy-ins to the top 3 (per the prize breakdown), routing rake→HOUSE, into winners' AVAILABLE via `LedgerService`. Show prize breakdown on league detail and a Prize transaction + notification on payout.
**Acceptance:** top-3 receive correct amounts, rake goes to HOUSE, ledger stays balanced, wallet history shows Prize entries.
**Tests:** distribution math (incl. rake); pool fully allocated (no cents lost); ledger balanced.

## Slice 9 — Cards + minting
**Goal:** Access Passes.
**Prompt:**
> Add `CardType`/`CardInstance` + a `CardCustodian` interface (internal implementation now). Mint a Pass on top-3 placement; implement "surrender to rank up" (burn a Pass for a promotion perk, irreversible, behind a confirm modal). Build the owned-Passes view per the Store design.
**Acceptance:** placing top-3 mints a Pass; surrender burns it and applies the promotion; owned view renders tiers/statuses.
**Tests:** mint-on-placement; surrender-burn is irreversible + applies perk; supply/serial integrity.

## Slice 10 — Marketplace (`/store`)
**Goal:** trade Passes.
**Prompt:**
> Build `/store` (My Passes / Marketplace) + Pass detail. Implement list-for-sale, buy (move AVAILABLE between users minus MARKET_FEE→HOUSE via `LedgerService`), and cancel-listing, with confirm modals and the insufficient-balance→deposit branch. Add `CardListing`/`CardTxn`.
**Acceptance:** a Pass lists, sells between two users, fee routes to HOUSE, ownership transfers, ledger balanced.
**Tests:** buy transfers ownership + funds + fee correctly; can't buy own/again-listed; ledger balanced.

## Slice 11 — Streaming (`/watch` + `/scores`)
**Goal:** broadcast surfaces.
**Prompt:**
> Add stream linking (Twitch/YouTube), a live-status polling job, embeds, `/watch` (Live/VOD grids per design), and `/scores` (live scoreboard, segmented Live/Upcoming/Completed, auto-refresh). Store VOD refs as match proof where relevant.
**Acceptance:** live streams appear on `/watch`; live scores update on `/scores`; VOD tab works.
**Tests:** live-status polling updates state; scores query returns correct buckets.

## Slice 12 — Champions League
**Goal:** the prestige tournament.
**Prompt:**
> Build the Champions League page + knockout `Bracket` (`/champions-league/bracket`) per design. Wire qualification (Elite top 4), bracket advancement from verified results, and the 70%-to-winner prize distribution via the ledger.
**Acceptance:** bracket renders + advances from verified results; winner receives 70% payout.
**Tests:** bracket advancement logic; prize split correct.

## Slice 13 — Payment gateway (the deferred piece)
**Goal:** turn on real money. **Do not start until the legal/KYC/geo track is complete.**
**Prompt:**
> Implement a real `PaymentProvider` (likely Stripe + Connect): deposits, withdrawals, KYC (Stripe Identity/Persona), and idempotent webhooks. Add the KYC gate on withdrawals, hold periods, velocity limits, and geo enforcement. Flip config from `StubPaymentProvider` to the real provider. No league/card/prize code should change.
**Acceptance:** a real deposit and a real payout complete (test mode) after KYC + hold; webhooks idempotent; only the payments module changed.
**Tests:** webhook idempotency; KYC gate blocks unverified withdrawals; hold/velocity enforced; deposit/withdraw post correct ledger txns.

## Slice 14 — Hardening + launch gates
**Goal:** production readiness.
**Prompt:**
> Add fraud/velocity rules, a nightly ledger reconciliation job (assert cached balances == ledger sums, alert on drift), rate limits, terms/age-gate enforcement, and polish the admin console. Produce a launch checklist.
**Acceptance:** reconciliation job green; rate limits + age-gate enforced; admin console usable; checklist complete.
**Tests:** reconciliation detects injected drift; rate limiter behavior.

---

## Global test spine (keep green across all slices)
- The **ledger invariant**: for any sequence of operations, every `txnId` sums to zero and cached balances equal ledger sums.
- **No balance mutation outside `LedgerService`** (lint/architecture test).
- **No concrete payment/card/validator provider imported directly** — only via interfaces.
- `db reset` + seed always yields a working demo on test credits.
