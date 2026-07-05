import type { Bucket, PrismaClient } from "@prisma/client";

export interface WalletBalances {
  availableCents: bigint;
  escrowCents: bigint;
  currency: string;
}

export interface LedgerHistoryItem {
  id: string;
  txnId: string;
  reason: string;
  bucket: Bucket;
  amountCents: bigint;
  createdAt: Date;
  refType: string | null;
  refId: string | null;
}

export interface LedgerPage {
  items: LedgerHistoryItem[];
  nextCursor: string | null;
}

/** Read-only wallet queries. Never mutates balances (that's LedgerService). */
export class WalletService {
  constructor(private readonly prisma: PrismaClient) {}

  async getBalances(userId: string): Promise<WalletBalances | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
      select: { availableCents: true, escrowCents: true, currency: true },
    });
  }

  async getWalletId(userId: string): Promise<string | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    return wallet?.id ?? null;
  }

  async getLedgerPage(
    walletId: string,
    opts: { cursor?: string | null; take?: number } = {},
  ): Promise<LedgerPage> {
    const take = Math.min(Math.max(opts.take ?? 10, 1), 50);
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { txn: { select: { reason: true, refType: true, refId: true } } },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((r) => ({
        id: r.id,
        txnId: r.txnId,
        reason: r.txn.reason,
        bucket: r.bucket,
        amountCents: r.amountCents,
        createdAt: r.createdAt,
        refType: r.txn.refType,
        refId: r.txn.refId,
      })),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }
}
