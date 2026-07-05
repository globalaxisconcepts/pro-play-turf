# Pro Play Turf — Builder Handoff (README)

Everything needed to build Pro Play Turf. Start here.

## What this is
Pro Play Turf (`proplayturf.com`) — a competitive 1v1 EA Sports FC platform: tiered leagues with promotion/relegation, a Champions League, live streaming, digital Access Passes + marketplace, and prize payouts. **Real money is deferred** — the whole app runs on an internal double-entry ledger with test credits until the payment gateway is added late (Slice 13).

## The documents (read in this order)

1. **`proplayturf-build-handover.md`** → rename to **`CLAUDE.md`** at the repo root. The operating manual: golden rules, stack, conventions, per-slice definition of done. *Claude Code reads this automatically.*
2. **`proplayturf-platform-architecture.md`** — the domain model (Prisma schema), subsystems, interfaces (`PaymentProvider`, `CardCustodian`, `ResultValidator`), and money invariants. The "what we're building."
3. **`proplayturf-build-plan.md`** — the execution playbook: 14 slices, each with a ready-to-run Claude Code prompt, acceptance criteria, and tests. The "how we build it," in order.
4. **`proplayturf-seed-plan.md`** — `prisma/seed.ts` plan for a believable demo on test credits.

## Design references (behavior + look — the builder implements these)

- **`Pro_Play_Turf.html`** — the finished, wired design bundle. The source of truth for look and screen behavior.
- **`proplayturf-design-brief.md`** — full visual + UX spec (tokens, components, per-page detail in §5).
- **`proplayturf-wiring-prompt.md`** — interaction spec (flows, states, edge cases).
- **`proplayturf-landing.html`** — the tokenized landing page; lift exact colors/fonts/spacing from its CSS.

## Kick-off

1. Put `CLAUDE.md` at the repo root; add the architecture + build-plan + seed docs to the repo (e.g. `/docs`).
2. Point Claude Code at `CLAUDE.md` + the architecture doc, then run **Slice 0 + Slice 2** from the build plan (foundations + the ledger — the critical core). Everything else stacks on Slice 2.
3. One slice per branch/PR. Verify each slice against its acceptance criteria + tests before merging. Keep the global test spine green (ledger sums to zero; balances == ledger; no balance mutation outside `LedgerService`).
4. Update `prisma/seed.ts` as each slice adds models, per the seed plan.

## Golden rules (the ones that matter most)
- No real payment SDK until Slice 13 — only `PaymentProvider` + `StubPaymentProvider`.
- The ledger is the only thing that moves money; every transaction is balanced double-entry.
- External boundaries stay behind interfaces (payments, card custody, result validation).
- No EA-API fiction — match truth is evidence + adjudication.
- Everything works end-to-end on test credits.

## Parallel track (owner: you, not Claude Code) — gates Slice 13 only
Legal review (skill-vs-gambling positioning + terms/age-gate by a gaming lawyer), KYC/AML provider + geo-restriction list, payment/payout gateway selection (Stripe + Connect), and withdrawal fraud/hold policy. **None of this blocks Slices 0–12** — it only gates turning real money on in Slice 13.

## Status
Design: complete (all screens built, no placeholders). Ready to build.
