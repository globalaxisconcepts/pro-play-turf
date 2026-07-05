# Pro Play Turf — Operating Manual (CLAUDE.md)

Competitive 1v1 EA Sports FC platform. Real money is **deferred** — everything runs on an
internal double-entry **ledger** with test credits until a real payment gateway arrives (Slice
13). Built in 14 vertical slices. Full design + plan in [`docs/`](docs/).

**Current status:** shipped — **Slice 0 (foundations)** + **Slice 2 (money core)** + **Slice 1
(Firebase auth + Firestore member profiles)**. Next per the build plan: Slice 3 (leagues) onward.

**Auth/data topology:** Firebase Auth (Email/Password + Google) → App-Router session cookies
(Admin SDK, Node runtime). Member/profile data lives in **Firestore** `members/{uid}` (server-side
via Admin SDK; `firestore.rules` denies client access). The **ledger stays in Neon Postgres**,
with a thin `User` anchor keyed by `firebaseUid`. `provisionUser` (src/server/provision.ts)
creates both stores on first sign-in. `auth()` (src/server/auth.ts) verifies the session cookie
and redirects to `/signin` when unauthenticated, with a **dev fallback** to the seeded demo player
when `FIREBASE_SERVICE_ACCOUNT_KEY` is unset (non-prod), so the app stays runnable/verifiable
offline. `firebase-admin` is Node-only (never Edge); `next.config.ts` has
`serverExternalPackages: ["firebase-admin"]`.

## Golden rules (never violate)

1. **Gateway is deferred.** No Stripe or any real payment SDK. All deposits/withdrawals/KYC go
   through the `PaymentProvider` interface; the only impl now is `StubPaymentProvider`.
2. **The ledger is the single source of truth for money.** `Wallet.availableCents/escrowCents`
   are caches. **Only `LedgerService.post()` may change them** — an architecture guard test
   enforces this. Every transaction is one `txnId` whose signed `LedgerEntry` amounts **sum to
   zero**. Money is **BigInt cents** everywhere (see `src/lib/money.ts`); never floats/Number.
3. **Everything works end-to-end on test credits.** No feature depends on the real gateway.
4. **External boundaries live behind interfaces:** `PaymentProvider` now; `CardCustodian` and a
   `ResultValidator` pipeline come later. No subsystem imports a concrete provider directly.
5. **No EA API fiction.** Match truth = submitted scores + proof + human adjudication.
6. **Money actions are idempotent.** `LedgerService.post` is idempotent by `txnId` (a
   `LedgerTransaction` row is the idempotency key). Reposting the same id is a no-op.
7. **Build to the design.** Behavior/look come from `docs/proplayturf-design-brief.md` and
   `docs/proplayturf-wiring-prompt.md`; don't invent flows. Reuse the tokens in
   `src/app/globals.css` and the shared components — no one-off colors, fonts, or variants.

## Stack & conventions (as built)

- **Next.js 16 (App Router) + TypeScript strict + Tailwind v4.** Server Components by default;
  Server Actions for mutations; Route Handlers for webhooks. `@/*` → `src/*`.
- **Prisma 6 with the node-postgres driver adapter** (`@prisma/adapter-pg`) — works with Neon,
  local Postgres, or `prisma dev`. Every schema change = a migration + updated seed.
- **Redis (Upstash REST)** for the production wallet lock; an in-process `async-mutex` lock is
  the default for dev/test. Lock impl chosen by `LEDGER_LOCK_DRIVER` (`memory` | `redis`).
- **Inngest** for background jobs (one health job so far). **Zod** at every boundary. **npm**.
- **Structure:** `src/app` (routes), `src/server` (framework-agnostic services: `ledger`,
  `payments`, `wallet`), `src/lib` (helpers: `money`, `db`, `redis`, `lock`, `env`), `prisma/`.
  Services take their deps by constructor (DI) so they're unit-testable.
- **Naming:** actions are verbs (`depositAction`, later `joinLeague`, `submitResult`); the UI
  label, action, and toast share vocabulary.

## Key implementation decisions (context for future work)

- **Correctness lives in the DB**, not the lock: sum-to-zero + atomic `{ increment }` on the
  caches + unique `txnId` + Serializable isolation + P2034 retry. The wallet lock is a
  best-effort contention/overdraft guard (single-instance Redis lock, **not** Redlock — its
  multi-master safety is meaningless against one Upstash endpoint).
- **HOUSE/PRIZE_POOL** live on a singleton **SYSTEM wallet** (`src/server/ledger/system.ts`) so
  `LedgerEntry.walletId` stays non-nullable; only user AVAILABLE/ESCROW are cached.
- **BigInt never crosses the RSC/Server-Action boundary raw** — format server-side or map to a
  string DTO (`centsToString`). No `BigInt.prototype.toJSON` monkeypatch.
- **Offline verification:** ledger integration tests run against **PGlite** (embedded Postgres,
  WASM) — real SQL, no Docker/server. Regenerate the bootstrap DDL with `npm run db:pglite-sql`
  after any schema change.
- **Auth is Firebase** behind the `auth()` helper (`src/server/auth.ts`); see the Auth/data
  topology note above. The client SDK (`src/lib/firebase/client.ts`) is used only for sign-in; all
  Firestore + token work is server-side via the Admin SDK (`src/lib/firebase/admin.ts`, lazy).

## Definition of done (every slice)

- [ ] `npm run typecheck` + `npm run lint` clean; `npm test` green.
- [ ] Prisma migration + `seed.ts` updated; a fresh `db:migrate` + `db:seed` yields a working
      demo on test credits (seed posts balances via `LedgerService`, never by writing rows).
- [ ] Unit tests for service logic; the ledger keeps its invariants (every txn sums to zero;
      cached balances == ledger sums; no balance mutation outside `LedgerService`).
- [ ] Works fully on stub/test credits — no gateway dependency.
- [ ] Matches the design; states covered (default/loading/empty/error/success).
- [ ] A11y floor: keyboard nav, visible focus, reduced-motion respected.

## Working process

- One slice per branch/PR; commit convention `slice-N: <what>`.
- Start a slice by reading this file + `docs/proplayturf-platform-architecture.md` +
  `docs/proplayturf-build-plan.md` + the relevant designed screens.
- Verify offline: `npm run typecheck && npm run lint && npm test && npm run build`.
