import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Prisma client singleton, built on the node-postgres driver adapter so it
 * speaks standard Postgres TCP — works against Neon's pooled connection
 * string, a local Postgres, or `prisma dev`. The pool connects lazily on the
 * first query, so constructing this at import time is safe during `next build`.
 *
 * Tests do NOT use this singleton — they inject a PGlite-backed client (see
 * tests/helpers/pglite.ts) so the ledger is verifiable with no server.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    env.DATABASE_URL ??
    // Placeholder so the app builds/loads before Neon is wired. Any query
    // against this will fail with a clear connection error at request time.
    "postgresql://placeholder:placeholder@localhost:5432/proplayturf";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Whether a real Postgres is wired. The seeded `.env` placeholder counts as
 * "not configured", so the app can run on Firebase auth alone and light the
 * wallet/ledger up automatically once a real DATABASE_URL is pasted in.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(env.DATABASE_URL) && !env.DATABASE_URL!.includes("placeholder");
}
