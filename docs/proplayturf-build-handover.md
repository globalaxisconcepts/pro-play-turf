# Pro Play Turf — Build Handover (CLAUDE.md)

> Drop this at the repo root as `CLAUDE.md`. It's the operating manual for building Pro Play Turf with Claude Code.
> Companions: `proplayturf-platform-architecture.md` (domain model + slices) and the wired Figma designs / `proplayturf-wiring-prompt.md` (behavior). This file is the *how we build* layer.

---

## Project

Pro Play Turf (`proplayturf.com`) is a skill-based 1v1 EA Sports FC competition platform: tiered leagues with promotion/relegation, a Champions League, live streaming, digital Access Passes + marketplace, and prize payouts. Real money is **deferred** — the whole product runs on an internal ledger with test credits until the payment gateway is added late (Slice 13).

---

## Golden rules (never violate these)

1. **Gateway is deferred.** Do NOT add Stripe or any real payment SDK. All deposits/withdrawals/KYC go through the `PaymentProvider` interface; the only implementation for now is `StubPaymentProvider` (auto-completing test credits + admin grants).
2. **The ledger is the single source of truth for money.** Balances (`Wallet.availableCents`, `escrowCents`) are caches. Only `LedgerService.post(txn)` may change them, guarded by a Redis lock per wallet. Every transaction is one `txnId` whose signed `LedgerEntry` amounts **sum to zero** (double-entry). Money is `BigInt` cents — never floats.
3. **Everything works end-to-end on test credits.** No feature may depend on the real gateway existing.
4. **External boundaries live behind interfaces:** `PaymentProvider` (money in/out), `CardCustodian` (card custody — internal now, blockchain-swappable later), `ResultValidator` pipeline (agreement + human review now, AI/EA slots open). No subsystem imports a concrete provider directly.
5. **No EA API fiction.** Match truth = submitted scores + proof + human adjudication. Never write code that assumes official EA telemetry.
6. **Webhooks and money actions are idempotent** (store processed event ids / use idempotency keys).
7. **Build to the wired designs.** Behavior comes from the Figma prototype / wiring prompt; don't invent flows.

---

## Stack & conventions

- **Next.js (App Router) + TypeScript (strict) + Tailwind.** Server Components by default; Server Actions for mutations; Route Handlers for webhooks/third-party callbacks.
- **Postgres + Prisma.** Every schema change = a migration + updated seed.
- **Redis** for per-wallet locks, idempotency keys, rate limits.
- **Background jobs:** Inngest (or Trigger.dev) for season-close, standings recompute, stream polling, ledger reconciliation. No business logic in request-time cron.
- **Validation:** Zod at every boundary (forms, actions, webhooks).
- **Auth:** Clerk or NextAuth (pick in Slice 1, wrap behind `auth()` helper).
- **Testing:** Vitest (unit — especially the ledger), Playwright (key flows). The ledger and escrow logic must have tests before anything consumes them.
- **Money:** `BigInt` cents everywhere; a single `money.ts` for formatting/parsing. Never `number` for balances.
- **Structure:** `src/app` (routes), `src/server` (services: `ledger`, `leagues`, `matches`, `payments`, `cards`, `payouts`), `src/lib` (helpers), `prisma/`. Services are framework-agnostic and unit-testable.
- **Naming:** actions are verbs (`joinLeague`, `submitResult`, `surrenderCard`); the UI label, action, and resulting toast share vocabulary (button "Publish" → toast "Published").

## Definition of done (every slice)

- [ ] Types pass (`tsc`), lint clean.
- [ ] Prisma migration + seed updated; `db reset` produces a working demo.
- [ ] Unit tests for service logic; Playwright for the slice's main flow.
- [ ] Works fully on **stub/test credits** — no gateway dependency.
- [ ] Matches the wired design (states: default/loading/empty/error/success).
- [ ] Accessibility floor: keyboard nav, visible focus, reduced-motion respected.
- [ ] No balance mutation outside `LedgerService`; no direct concrete-provider imports.

---

## Build order (14 slices)

Each ships end-to-end on test credits. Full detail (schema, subsystems) is in the architecture doc; this is the sequence + done-criteria.

0. **Foundations** — Next.js/TS/Tailwind/Prisma/Postgres/Redis/jobs/CI, base layout+nav. *Done: deploys, migrates, a job runs.*
1. **Auth + profile + gamertag + geo** — register/verify, link EA + streaming, capture region. *Done: user registers, links accounts, blocked regions can't sign up.*
2. **Ledger + Wallet + PaymentProvider(Stub)** — double-entry `LedgerService` (Redis-locked), `PaymentProvider` + `StubPaymentProvider`, admin test-credit grant, `/wallet`. *Done: a stub deposit shows AVAILABLE backed by balanced entries.* ← **critical slice.**
3. **Seasons/divisions/leagues scaffolding + browse** — admin config, `/leagues`. *Done: leagues listed by division.*
4. **Join league (escrow)** — AVAILABLE→ESCROW atomic, capacity + double-join guards, pre-start refund. *Done: joining holds funds; refund releases.*
5. **Fixtures + submit result + proof** — schedule gen, `/matches/[id]` submit + proof. *Done: two agreeing submissions → VERIFIED, standings update.*
6. **Validation pipeline + tribunal + disputes** — agreement auto-verify, human review queue, dispute flow, AuditLog. *Done: a disagreement lands in the queue and resolves.*
7. **Standings + season close** — standings engine, season-close job → settle + promote/relegate + open next. *Done: closing a season moves players across divisions.*
8. **Prize pools** — distribute top-3 minus rake→HOUSE into winners' AVAILABLE. *Done: winners paid in internal credits.*
9. **Cards + minting** — CardType/Instance, mint on placement, surrender-to-rank-up burn, owned view. *Done: placing top-3 mints a Pass; surrender promotes.*
10. **Marketplace `/store`** — list/buy/sell via internal balance, MARKET_FEE→HOUSE, `CardCustodian` interface. *Done: a Pass trades between users.*
11. **Streaming `/watch` + `/scores`** — live-status polling, embeds, live scoreboard. *Done: live streams + scores render.*
12. **Champions League** — top-division bracket + `/champions-league/bracket`. *Done: bracket advances from verified results.*
13. **Payment gateway (deferred piece)** — implement real `PaymentProvider` (deposits/withdrawals/KYC + idempotent webhooks), KYC gate, hold periods, velocity limits, geo enforcement; flip config Stub→real. *Done: a real payout completes after KYC + hold. No other subsystem changes.*
14. **Hardening + legal gates** — fraud rules, ledger reconciliation job, terms/age-gate, rate limits, admin polish. *Done: launch checklist green.*

---

## Ready-to-run prompts

**Slice 0 + 2 (kick-off — do these first):**
> Scaffold a Next.js (App Router) + TypeScript (strict) + Tailwind + Prisma/Postgres project with Redis and Inngest wired, CI, and a base layout with the nav from the design. Then implement Slice 2: Prisma models `User`, `Wallet`, `LedgerEntry`; a `LedgerService.post()` that writes balanced double-entry transactions (signed amounts sum to zero) under a Redis per-wallet lock and updates the cached wallet balances; a `PaymentProvider` interface and a `StubPaymentProvider` whose `createDeposit` auto-completes a HOUSE→AVAILABLE deposit txn; an admin "grant test credits" action; and a `/wallet` page showing balance + paginated ledger history. Include Vitest tests asserting every txn sums to zero, that concurrent posts don't corrupt balances, and that balances always equal the ledger sum. Money is BigInt cents throughout.

**Slice 4 (escrow):**
> Implement league join: a `joinLeague` server action that atomically moves the buy-in AVAILABLE→ESCROW via `LedgerService`, with capacity and double-join guards and a pre-start refund path that reverses the escrow. Wire the confirm modal from the design (buy-in debit, rules acceptance) and the insufficient-balance → deposit branch. Tests: escrow holds exactly the buy-in, refund restores it, capacity is enforced, no double-join.

**Slice 9 (cards):**
> Implement Access Passes: `CardType`/`CardInstance` models, minting on top-3 placement, a `CardCustodian` interface (internal implementation now), and a "surrender to rank up" action that burns a Pass and applies a promotion perk (irreversible, behind a confirm modal). Owned-passes view per the Store design. Tests for mint-on-placement and surrender-burn.

---

## Working process with Claude Code

- **One slice per branch/PR.** Keep changes reviewable; don't run slices together.
- Start each slice by pointing Claude Code at this file + the architecture doc + the relevant wired screens.
- Run the test + seed after each slice; `db reset` must always yield a working demo on test credits.
- Commit convention: `slice-N: <what>`.
- If a slice needs a schema change, migration + seed land in the same PR.

## Parallel non-build track (owner: you, not Claude Code)

Runs alongside the build; **must be complete before Slice 13 flips real money on:**
- Legal review of skill-vs-gambling positioning for target regions; terms/age-gate drafted by a gaming lawyer.
- KYC/AML provider chosen (e.g. Stripe Identity / Persona) and geo-restriction list finalized.
- Payment + payout gateway selected (likely Stripe + Connect) and account/underwriting started.
- Fraud/velocity/hold-period policy defined for withdrawals.

Nothing above blocks Slices 0–12. It only gates go-live of Slice 13.
