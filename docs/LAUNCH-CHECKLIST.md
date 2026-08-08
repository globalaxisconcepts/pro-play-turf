# Pro Play Turf — Launch Checklist

Status as of Slice 14. Tick nothing on someone else's behalf: each line is either
demonstrably true or it isn't.

**Current verdict: NOT ready for a real-money public launch.** Ready for a closed
beta on test credits once the items in §1 are done.

---

## 1. Blocking — must be true before any public launch

| ✔ | Item | State |
|---|---|---|
| ☐ | Real payment gateway (Slice 13) | **Not started.** `StubPaymentProvider` is the only implementation. |
| ☐ | Legal opinion on skill-gaming in target markets | **Not started.** Your track, not the codebase's. |
| ☐ | KYC provider selected and integrated | **Not started.** Gated behind Slice 13. |
| ☐ | Geo-restriction enforcement | **Not started.** |
| ☐ | Terms, Privacy, and Responsible Play pages published | **Not written.** The age gate references policies that don't exist yet as pages. |
| ☐ | Withdrawals actually possible | **No.** `capabilities.withdrawals === false`. |
| ✅ | Test-credit deposits cannot mint money in production | Gated behind `ENABLE_TEST_CREDIT_DEPOSITS=1`, off by default. |
| ✅ | Marketing copy doesn't promise what doesn't exist | "Instant Withdrawals" → "Instant Settlement"; pool figure marked as a target. |

## 2. Money integrity

| ✔ | Item | State |
|---|---|---|
| ✅ | Every ledger transaction sums to zero | Enforced in `LedgerService.post`; asserted across the suite. |
| ✅ | Cached balances equal ledger sums | `reconcileLedger`, nightly job + `/admin/integrity`. |
| ✅ | Reconciliation fails loudly on drift | Job throws; never auto-repairs (that would destroy evidence). |
| ✅ | Only `LedgerService` mutates balances | Architecture guard test. |
| ✅ | Money actions idempotent | Deterministic `txnId` per action; reposting is a no-op. |
| ⚠️ | Wallet lock is per-instance | `LEDGER_LOCK_DRIVER=memory`. Postgres Serializable still guarantees correctness; set `redis` before real concurrency. |

## 3. Abuse and safety

| ✔ | Item | State |
|---|---|---|
| ✅ | Age gate enforced server-side on every money action | `ComplianceService.guard`, not just at signup. |
| ✅ | Terms acceptance recorded and re-prompted on revision | `UserCompliance.termsVersion`. |
| ✅ | Accounts can be restricted with a reason, audit-logged | `restrict` / `unrestrict`. |
| ✅ | Rate limits on deposits, entries, reports, market | `LIMITS` in `src/lib/rate-limit`. |
| ⚠️ | Rate limits are per-instance | `RATE_LIMIT_DRIVER=memory`. Set `redis` before real traffic. |
| ✅ | User-supplied URLs can't become clickable XSS | `safeExternalUrl` at every render site. |
| ✅ | Every adjudication is audit-logged | Written in the same transaction as the change. |
| ☐ | Automated fraud/collusion detection | **Not built.** Human review only. |
| ☐ | Self-exclusion / deposit limits | **Not built.** Required for responsible-play compliance. |

## 4. Operations

| ✔ | Item | State |
|---|---|---|
| ✅ | Nightly ledger reconciliation | Inngest cron `0 3 * * *`. |
| ✅ | Admin integrity dashboard | `/admin/integrity`. |
| ☐ | Error monitoring / alerting | **Not wired.** Failed Inngest runs are the only current signal. |
| ☐ | Database backups verified by restore | **Not verified.** Neon has PITR; a restore has never been tested. |
| ⚠️ | One database serves local dev and production | Use a Neon branch for local work. |
| ⚠️ | No migration history | `prisma/migrations/` does not exist; schema changes go via `db:push`. Baseline before real data matters. |

## 5. Product completeness

| ✔ | Item | State |
|---|---|---|
| ✅ | Join → play → report → adjudicate → standings → payout | Slices 4–8. |
| ✅ | Passes: mint, trade, surrender | Slices 9–10. |
| ✅ | Streaming + scoreboard | Slice 11. |
| ✅ | Champions League knockout | Slice 12. |
| ⚠️ | Live stream detection | Needs a Twitch/YouTube app registration. |
| ⚠️ | Screenshot proof upload | Needs blob storage; stream/VOD links work today. |

---

## Switching the gates on

```bash
# Production, once the real gateway exists — NOT before:
ENABLE_TEST_CREDIT_DEPOSITS=   # leave empty; "1" mints free money

# Before real traffic:
RATE_LIMIT_DRIVER=redis
LEDGER_LOCK_DRIVER=redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Age threshold (default 18):
MIN_AGE_YEARS=18
```

## Verifying before a release

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Then open `/admin/integrity` and confirm the ledger reconciles and no gate shows ⚠
that you didn't intend.
