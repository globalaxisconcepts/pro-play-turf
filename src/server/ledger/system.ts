/**
 * Well-known ids for the singleton SYSTEM/HOUSE account. Seeded with these
 * fixed ids so ledger code can reference the HOUSE wallet as a constant. HOUSE
 * and PRIZE_POOL entries live here; the wallet's availableCents/escrowCents
 * caches stay at 0 (those buckets are reconciled by summation, not cached).
 */
export const SYSTEM_USER_ID = "system-house-user";
export const SYSTEM_WALLET_ID = "system-house-wallet";
