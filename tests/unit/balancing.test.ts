import { Bucket, type PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import {
  InvalidTxnError,
  UnbalancedTxnError,
} from "@/server/ledger/errors";
import { LedgerService } from "@/server/ledger/ledger-service";

// These assertions run entirely in validate(), before any DB access, so a dummy
// Prisma client is never touched — this proves the sum-to-zero / structure
// invariants without a database.
const dummyPrisma = {} as unknown as PrismaClient;

function service(): LedgerService {
  return new LedgerService(dummyPrisma, new InProcessWalletLock());
}

describe("LedgerService structural validation", () => {
  it("rejects a transaction whose entries do not sum to zero", async () => {
    await expect(
      service().post({
        txnId: "bad-sum",
        reason: "DEPOSIT",
        lines: [
          { walletId: "a", bucket: Bucket.AVAILABLE, amountCents: 1000n },
          { walletId: "b", bucket: Bucket.HOUSE, amountCents: -900n },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedTxnError);
  });

  it("accepts a balanced transaction past validation (fails later at the DB)", async () => {
    // Balanced, so validate() passes; then it reaches the dummy prisma and
    // throws something OTHER than the validation errors.
    await expect(
      service().post({
        txnId: "ok-sum",
        reason: "DEPOSIT",
        lines: [
          { walletId: "a", bucket: Bucket.AVAILABLE, amountCents: 1000n },
          { walletId: "b", bucket: Bucket.HOUSE, amountCents: -1000n },
        ],
      }),
    ).rejects.not.toBeInstanceOf(UnbalancedTxnError);
  });

  it("requires at least two entries", async () => {
    await expect(
      service().post({
        txnId: "one-leg",
        reason: "DEPOSIT",
        lines: [{ walletId: "a", bucket: Bucket.AVAILABLE, amountCents: 0n }],
      }),
    ).rejects.toBeInstanceOf(InvalidTxnError);
  });

  it("requires a txnId", async () => {
    await expect(
      service().post({
        txnId: "",
        reason: "DEPOSIT",
        lines: [
          { walletId: "a", bucket: Bucket.AVAILABLE, amountCents: 1000n },
          { walletId: "b", bucket: Bucket.HOUSE, amountCents: -1000n },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidTxnError);
  });
});
