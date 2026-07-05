# Pro Play Turf

A competitive 1v1 EA Sports FC platform — tiered leagues with promotion/relegation, a
Champions League, live streaming, digital "Access Pass" cards + marketplace, and prize
payouts. Real money is **deferred**: the whole product runs on an internal, double-entry
**ledger** with test credits until a real payment gateway is dropped in late (Slice 13).

Built as 14 vertical slices (see [`docs/`](docs/)). **This repo implements Slice 0
(foundations) + Slice 2 (the money core) + Slice 1 (Firebase auth + member profiles).**

## What's built

- **Design system + marketing home (`/`)** — the reference landing page, ported to React with
  the exact tokens (turf-green `#3DFF88`, gold `#F6C453`, azure `#38BDF8` on navy `#050B17`;
  Archivo / Chakra Petch / Inter). Global shell (nav + footer + mobile menu), the signature
  **Pass Card**, hero, section reveals, count-ups, and card tilt — responsive to 360px, with
  reduced-motion respected.
- **Double-entry ledger + wallet (`/wallet`)** — a `LedgerService` that is the only code allowed
  to move money: every transaction is balanced (signed cents sum to zero), posted under a
  per-wallet lock inside a Serializable Prisma transaction, with atomic balance increments and
  idempotency by `txnId`. A `PaymentProvider` interface + `StubPaymentProvider` (test-credit
  deposits), an admin "grant test credits" action, and the wallet page (balances + history +
  deposit modal).
- **Auth + member profiles (`/signin`, `/signup`)** — **Firebase Authentication**
  (Email/Password + Google) with App-Router **session cookies** (minted/verified by the Admin
  SDK, Node runtime). On first sign-in a user is provisioned across **both** datastores:
  a **Firestore** `members/{uid}` profile doc **and** a thin Postgres `User` anchor (+ empty
  `Wallet`). `/wallet` is guarded and redirects to `/signin` when unauthenticated. A **dev
  fallback** resolves to the seeded demo player when Firebase isn't configured, so the app stays
  runnable offline.
- **Foundations** — Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · Prisma 6
  (node-postgres driver adapter) · Upstash Redis (prod lock) · Inngest (a health job) · Zod ·
  Vitest. Verified offline (see below).

## Data model at a glance

- **Firebase Auth** = identity. **Firestore** `members/{uid}` = member/profile data (server-side
  via the Admin SDK; direct client access denied by `firestore.rules`). **Neon Postgres** = the
  transactional double-entry ledger + a thin `User` anchor keyed by `firebaseUid`. The Firebase
  `uid` is the bridge between the two.

## Stack

Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS v4 · Prisma 6 (`@prisma/adapter-pg`) ·
Postgres (Neon) · **Firebase Auth + Firestore** · Upstash Redis · Inngest · Zod · Vitest · PGlite
(offline test DB).

## Quick start

```bash
npm install          # also runs `prisma generate`
npm run dev          # http://localhost:3000  — home renders with no DB needed
```

The marketing pages work with no infrastructure. To run the full app (auth + DB-backed wallet):

1. **Postgres** — create a [Neon](https://neon.tech) project and put its pooled connection
   string in `.env` as `DATABASE_URL` (any standard Postgres URL / local Postgres / `npx prisma
   dev` also works). Then:
   ```bash
   npm run db:push      # create tables (or db:migrate for a committed migration)
   npm run db:seed      # seed SYSTEM/HOUSE + a demo pro + a rookie, all via the ledger
   ```
2. **Firebase** (project `pro-play-turf` already exists) — in the Firebase console:
   enable **Email/Password + Google** (Authentication → Sign-in method), create the **Firestore**
   database (Native mode), and **Project settings → Service accounts → Generate new private key**.
   Put `base64 -w0 serviceAccount.json` into `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`. The public
   `NEXT_PUBLIC_FIREBASE_*` config is already in `.env.example`. Deploy the Firestore rules with
   `firebase deploy --only firestore:rules`. Setting the service-account key switches off the dev
   fallback and turns on real auth.
3. **Redis (optional, prod-style)** — for a real distributed lock, create an
   [Upstash](https://upstash.com) database, set `UPSTASH_REDIS_REST_URL` / `_TOKEN`, and set
   `LEDGER_LOCK_DRIVER=redis`. The default `memory` lock is fine for single-process dev.

See [`.env.example`](.env.example) for all variables.

## Deploy to Vercel

The app is Vercel-ready — Next.js is auto-detected and `prisma generate` runs in the build step.
Deploy by importing the repo at [vercel.com/new](https://vercel.com/new), or run `vercel` from the
CLI. Set these environment variables in the Vercel project (Production **and** Preview):

| Variable | Kind | Notes |
|---|---|---|
| `DATABASE_URL` | secret | Neon **pooled** connection string (`...-pooler...?sslmode=require`). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | secret | base64 of the Admin service-account JSON. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | public | **must be set at build time** (inlined into the client). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | public | `pro-play-turf.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | public | `pro-play-turf` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | public | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | public | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | public | |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | secret | only if `LEDGER_LOCK_DRIVER=redis` |
| `LEDGER_LOCK_DRIVER` | plain | set to `redis` in production so the per-wallet lock works across serverless instances |

The `NEXT_PUBLIC_*` values are the public web config (same ones in your local `.env`); the two
secrets are generated per the Quick start above.

**After the first deploy:**
1. Firebase console → Authentication → Settings → **Authorized domains** → add your Vercel
   domain(s) (e.g. `pro-play-turf.vercel.app` + any custom domain) — required or Google sign-in
   fails.
2. Run the DB migration + seed against Neon once (locally with the prod `DATABASE_URL`, or
   `vercel env pull` then `npm run db:push && npm run db:seed`).
3. Deploy the Firestore rules: `firebase deploy --only firestore:rules`.

Pick a Vercel region close to your Neon region for latency.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest — unit + PGlite integration |
| `npm run db:migrate` / `db:seed` | Prisma migrate + seed |
| `npm run db:pglite-sql` | Regenerate the offline test DDL after a schema change |

## Verification (runs offline — no Docker, no DB/Redis server)

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

- **28 tests pass**, including 6 **PGlite** integration tests (real Postgres compiled to WASM,
  in-process) that prove the ledger: balanced posts, cache == ledger-sum after N ops, overdraft
  rollback, lock serialization (exactly one of two concurrent spends wins), idempotency, and the
  stub deposit path. An **architecture guard** test fails the build if any balance mutation
  appears outside `LedgerService`.
- Tests needing a real server (Upstash lock behaviour, true Serializable conflicts on Neon,
  Playwright E2E) are gated to run once that infra is wired.

## Project structure

```
src/app/            routes — (marketing)/ home, (app)/wallet, signin, signup, api/inngest
src/components/      shell (nav/footer/logo) · ui (PassCard) · fx (ScrollFX) · auth
src/lib/             env · money (BigInt cents) · db · redis · inngest · lock (in-process + redis)
src/server/          ledger (LedgerService) · payments (Stub) · wallet (read) · auth · services
prisma/              schema.prisma · seed.ts
tests/               unit + integration (PGlite)
docs/                the full design brief, wiring spec, architecture, and 14-slice build plan
```

## Roadmap

Done: Slice 0 (foundations), Slice 2 (ledger), Slice 1 (Firebase auth + member profiles). Next:
3 (leagues) → 4 (join/escrow) → 5 (matches) → 6 (validation) → 7 (standings/season close) →
8 (prizes) → 9 (cards) → 10 (marketplace) → 11 (streaming) → 12 (Champions League) →
13 (real payment gateway) → 14 (hardening). See
[`docs/proplayturf-build-plan.md`](docs/proplayturf-build-plan.md).
