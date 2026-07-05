/**
 * Session cookie constants. Kept dependency-free (no next/headers) so both the
 * Node route handler / `auth()` (via `cookies()`) and `proxy.ts` (via
 * `req.cookies`) can share them.
 */
export const SESSION_COOKIE = "__session";

/** Firebase session cookies allow up to 14 days; 5 is a sensible default. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
