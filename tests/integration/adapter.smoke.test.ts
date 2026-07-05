import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../helpers/pglite";

// Fails fast and loudly if the Prisma <-> PGlite adapter pair drifts out of
// compatibility, instead of surfacing as a confusing ledger-test failure.
describe("prisma + pglite adapter smoke", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await createTestDb();
  });
  afterEach(async () => {
    await db.close();
  });

  it("connects, writes, and reads back a row", async () => {
    await db.prisma.user.create({
      data: { id: "smoke", email: "smoke@test", displayName: "Smoke" },
    });
    const found = await db.prisma.user.findUnique({ where: { id: "smoke" } });
    expect(found?.displayName).toBe("Smoke");
  });

  it("round-trips BigInt columns", async () => {
    await db.prisma.user.create({
      data: { id: "u", email: "u@test", displayName: "U" },
    });
    await db.prisma.wallet.create({
      data: { id: "w", userId: "u", availableCents: 9_007_199_254_740_993n },
    });
    const w = await db.prisma.wallet.findUnique({ where: { id: "w" } });
    expect(w?.availableCents).toBe(9_007_199_254_740_993n);
    expect(typeof w?.availableCents).toBe("bigint");
  });
});
