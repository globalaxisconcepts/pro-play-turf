import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { type Prisma, PrismaClient } from "@prisma/client";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";

/**
 * Bootstrap DDL, generated from prisma/schema.prisma with:
 *   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
 * Regenerate via `npm run db:pglite-sql` whenever the schema changes.
 */
const SCHEMA_SQL = readFileSync(
  fileURLToPath(new URL("./schema.sql", import.meta.url)),
  "utf8",
);

export interface TestDb {
  prisma: PrismaClient;
  close(): Promise<void>;
}

/** Fresh in-process Postgres (WASM) with the schema applied. No server/Docker. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.exec(SCHEMA_SQL);
  // pglite-prisma-adapter bundles its own nested @prisma/driver-adapter-utils,
  // so its factory type is nominally different from what @prisma/client expects
  // even though it's structurally identical and works at runtime (see tests).
  // Cast at this single test-only seam using Prisma's own option type.
  const adapter = new PrismaPGlite(
    client,
  ) as unknown as Prisma.PrismaClientOptions["adapter"];
  const prisma = new PrismaClient({ adapter });
  return {
    prisma,
    async close() {
      await prisma.$disconnect();
      await client.close();
    },
  };
}

export interface SeededWallets {
  systemWalletId: string;
  playerUserId: string;
  playerWalletId: string;
}

/** Seed the singleton SYSTEM/HOUSE wallet plus one demo player wallet. */
export async function seedWallets(prisma: PrismaClient): Promise<SeededWallets> {
  await prisma.user.create({
    data: {
      id: SYSTEM_USER_ID,
      email: "system@proplayturf.internal",
      displayName: "House",
      role: "SYSTEM",
    },
  });
  await prisma.wallet.create({
    data: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
  });

  const playerUserId = "p1";
  await prisma.user.create({
    data: { id: playerUserId, email: "p1@proplayturf.test", displayName: "Player One" },
  });
  const wallet = await prisma.wallet.create({
    data: { id: "wallet-p1", userId: playerUserId },
  });

  return {
    systemWalletId: SYSTEM_WALLET_ID,
    playerUserId,
    playerWalletId: wallet.id,
  };
}
