import type { Bucket } from "@prisma/client";

/** One leg of a double-entry transaction. `amountCents` is signed. */
export interface LedgerLine {
  walletId: string;
  bucket: Bucket;
  amountCents: bigint;
}

/**
 * A balanced transaction to post. `txnId` is the idempotency key — reposting
 * the same id is a no-op. The signed `amountCents` across all `lines` must
 * sum to exactly 0.
 */
export interface TxnInput {
  txnId: string;
  reason: string;
  refType?: string;
  refId?: string;
  lines: LedgerLine[];
}
