/**
 * Session roles. Prisma's `Role` enum also has SYSTEM — the singleton house
 * account, which is never a signed-in identity — so DB roles are narrowed here
 * before they reach a session. Pure and dependency-free (no `server-only`) so
 * both server code and tests can use it.
 */
export type AppRole = "PLAYER" | "REVIEWER" | "ADMIN";

/** Narrow a Prisma `Role` to the roles the app session understands. */
export function appRole(role: string): AppRole {
  return role === "ADMIN" || role === "REVIEWER" ? role : "PLAYER";
}
