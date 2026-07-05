import { Bucket, Prisma, type PrismaClient } from "@prisma/client";
import type { WalletLock } from "@/lib/lock";
import { sumZero } from "@/lib/money";
import {
  DuplicateTxnError,
  InsufficientFundsError,
  InvalidTxnError,
  UnbalancedTxnError,
} from "./errors";
import type { LedgerLine, TxnInput } from "./types";

type WalletDeltas = Map<string, { available: bigint; escrow: bigint }>;

/** Net the signed lines into per-wallet AVAILABLE / ESCROW cache deltas. */
function aggregate(lines: LedgerLine[]): WalletDeltas {
  const map: WalletDeltas = new Map();
  for (const line of lines) {
    const cur = map.get(line.walletId) ?? { available: 0n, escrow: 0n };
    if (line.bucket === Bucket.AVAILABLE) cur.available += line.amountCents;
    else if (line.bucket === Bucket.ESCROW) cur.escrow += line.amountCents;
    // HOUSE / PRIZE_POOL entries are not cached on the wallet.
    map.set(line.walletId, cur);
  }
  return map;
}

function backoff(attempt: number): Promise<void> {
  const ms = 10 * 2 ** attempt + Math.floor(Math.random() * 15);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface LedgerServiceOptions {
  /** Retries on a Serializable write-conflict (P2034). */
  maxRetries?: number;
  /** Reject transactions that would drive a user bucket negative. */
  enforceNonNegative?: boolean;
}

/**
 * The ONLY code allowed to mutate wallet balances. Every call writes a balanced,
 * double-entry transaction whose signed amounts sum to zero, under a per-wallet
 * lock, inside a Serializable Prisma transaction. Cached balances are updated
 * with atomic `{ increment }` operations (never read-modify-write), so the
 * cache is a deterministic function of the ledger regardless of interleaving.
 * Idempotent by `txnId`.
 */
export class LedgerService {
  private readonly maxRetries: number;
  private readonly enforceNonNegative: boolean;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly lock: WalletLock,
    opts: LedgerServiceOptions = {},
  ) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.enforceNonNegative = opts.enforceNonNegative ?? true;
  }

  async post(input: TxnInput): Promise<void> {
    this.validate(input);
    const walletIds = input.lines.map((l) => l.walletId);
    await this.lock.withLocks(walletIds, () => this.postLocked(input));
  }

  private validate(input: TxnInput): void {
    if (!input.txnId) throw new InvalidTxnError("txnId is required");
    if (input.lines.length < 2) {
      throw new InvalidTxnError("a transaction needs at least two entries");
    }
    if (!sumZero(input.lines.map((l) => l.amountCents))) {
      throw new UnbalancedTxnError(input.txnId);
    }
  }

  private async postLocked(input: TxnInput): Promise<void> {
    const deltas = aggregate(input.lines);
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await this.createTxnRow(tx, input);
            await tx.ledgerEntry.createMany({
              data: input.lines.map((l) => ({
                txnId: input.txnId,
                walletId: l.walletId,
                bucket: l.bucket,
                amountCents: l.amountCents,
              })),
            });
            await this.applyDeltas(tx, deltas);
            if (this.enforceNonNegative) await this.assertNonNegative(tx, deltas);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10_000,
            maxWait: 5_000,
          },
        );
        return;
      } catch (err) {
        // Idempotent: the same txnId was already committed — treat as success.
        if (err instanceof DuplicateTxnError) return;
        if (this.isWriteConflict(err) && attempt < this.maxRetries) {
          await backoff(attempt);
          continue;
        }
        throw err;
      }
    }
  }

  private async createTxnRow(
    tx: Prisma.TransactionClient,
    input: TxnInput,
  ): Promise<void> {
    try {
      await tx.ledgerTransaction.create({
        data: {
          id: input.txnId,
          reason: input.reason,
          refType: input.refType ?? null,
          refId: input.refId ?? null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new DuplicateTxnError(input.txnId);
      }
      throw err;
    }
  }

  private async applyDeltas(
    tx: Prisma.TransactionClient,
    deltas: WalletDeltas,
  ): Promise<void> {
    for (const [walletId, d] of deltas) {
      const data: Prisma.WalletUpdateInput = {};
      if (d.available !== 0n) data.availableCents = { increment: d.available };
      if (d.escrow !== 0n) data.escrowCents = { increment: d.escrow };
      if (Object.keys(data).length === 0) continue; // HOUSE-only wallet
      await tx.wallet.update({ where: { id: walletId }, data });
    }
  }

  private async assertNonNegative(
    tx: Prisma.TransactionClient,
    deltas: WalletDeltas,
  ): Promise<void> {
    const ids = [...deltas.keys()];
    const wallets = await tx.wallet.findMany({
      where: { id: { in: ids } },
      select: { id: true, availableCents: true, escrowCents: true },
    });
    for (const w of wallets) {
      if (w.availableCents < 0n || w.escrowCents < 0n) {
        throw new InsufficientFundsError(w.id);
      }
    }
  }

  private isWriteConflict(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034"
    );
  }
}
