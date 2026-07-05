# Deploying Pro Play Turf to Vercel

The app is Vercel-ready — Next.js is auto-detected, the build runs `prisma generate && next build`,
Node is pinned to 22.x, and `firebase-admin` is externalized. Deploy via the **Vercel dashboard
(Git integration)** so every future push auto-deploys.

## 1. Import the repo

1. Go to **[vercel.com/new](https://vercel.com/new)** → **Import Git Repository**.
2. Select **`globalaxisconcepts/pro-play-turf`**.
3. Leave Framework Preset = **Next.js** and Build/Install/Output at their defaults. No `vercel.json`
   is needed.

## 2. Environment variables (set BEFORE the first deploy)

Add all of these to **Production _and_ Preview** (Settings → Environment Variables — you can paste
the whole block at once). Fill in the last value from your local `.env`.

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBQYVZLNXaQcGzg11SV0XSIpTjbLE79AKc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pro-play-turf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pro-play-turf
NEXT_PUBLIC_FIREBASE_APP_ID=1:981826665354:web:4811844973ba0b3debe673
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=981826665354
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pro-play-turf.firebasestorage.app
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/proplayturf?schema=public
LEDGER_LOCK_DRIVER=memory
FIREBASE_SERVICE_ACCOUNT_KEY=<base64 of the service-account JSON — from your local .env>
```

| Variable | Kind | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6) | public | Inlined into the client **at build time** — must be set before the first deploy. The `apiKey` is a public identifier, not a secret. |
| `DATABASE_URL` | required | The **placeholder** value above lets the build's `prisma generate` run and leaves the wallet in "connect a database" mode. Swap for the Neon **pooled** URL when you wire Neon. |
| `LEDGER_LOCK_DRIVER` | plain | `memory` for now (the ledger is inactive until Neon). Set `redis` in production once the ledger is live (see below). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **secret** | base64 of the Admin service-account JSON. Copy it from your local `.env`. **Recommended:** rotate the key first (Google Cloud → IAM → Service Accounts → delete the old key, generate a new one) and paste the fresh one. |

## 3. Deploy

Click **Deploy**. First build takes ~1–2 min.

## 4. Authorize the Vercel domain in Firebase (one-time)

After the deploy, copy your domain (e.g. `pro-play-turf.vercel.app`) and add it in
**Firebase console → Authentication → Settings → Authorized domains → Add domain**. This is
**required for Google sign-in**; email/password works without it. (Add any custom domain here too.)
No redeploy needed.

## 5. Verify

- Visit the Vercel URL → the home page renders.
- `/signup` → sign up with **email** and with **Google** → you land on `/wallet` showing the
  "connect a database" notice.
- Open `/wallet` in a private window (no session) → it redirects to `/signin`.
- Check Firestore → a `members/{uid}` document exists for the account you created.

## Later — turning on the wallet ledger

1. Create a Neon project, set **`DATABASE_URL`** in Vercel to its **pooled** connection string,
   and redeploy. The wallet activates automatically (no code change).
2. Run the schema + seed against Neon once: locally with the prod `DATABASE_URL`
   (`npm run db:push && npm run db:seed`), or via `vercel env pull` then the same commands.
3. For a correct per-wallet lock across serverless instances, create an Upstash Redis DB, set
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, and set `LEDGER_LOCK_DRIVER=redis`.
