/**
 * Fixed ids for the seeded demo accounts. Deliberately dependency-free (no
 * `server-only`): `prisma/seed.ts` runs under plain Node via tsx, where
 * importing a server-only module throws.
 */

/** The seeded demo player — also the offline `auth()` fallback identity. */
export const DEMO_USER_ID = "demo-player-user";

/** The seeded admin. Reach /admin offline with DEV_SESSION_USER_ID set to this. */
export const DEMO_ADMIN_USER_ID = "demo-admin-user";
