import { randomUUID } from "node:crypto";
import { Bucket, type PrismaClient } from "@prisma/client";
import type { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_WALLET_ID } from "@/server/ledger/system";
import type {
  CreateDepositInput,
  DepositIntent,
  KycResult,
  PaymentProvider,
  WithdrawalResult,
} from "./provider";

/**
 * Test-credit provider. `createDeposit` completes immediately and posts a
 * balanced HOUSE → AVAILABLE deposit through the ledger. Withdrawals/KYC are
 * no-ops until the real gateway (Slice 13).
 */
export class StubPaymentProvider implements PaymentProvider {
  readonly capabilities = { deposits: true, withdrawals: false, kyc: false };

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledger: LedgerService,
  ) {}

  async createDeposit({
    userId,
    amountCents,
    reason = "DEPOSIT",
  }: CreateDepositInput): Promise<DepositIntent> {
    if (amountCents <= 0n) {
      throw new Error("Deposit amount must be positive.");
    }
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) throw new Error(`No wallet for user ${userId}.`);

    const txnId = `dep_${randomUUID()}`;
    await this.ledger.post({
      txnId,
      reason,
      refType: "deposit",
      refId: txnId,
      lines: [
        { walletId: wallet.id, bucket: Bucket.AVAILABLE, amountCents },
        { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE, amountCents: -amountCents },
      ],
    });
    return { status: "COMPLETED", txnId };
  }

  async handleWebhook(): Promise<{ handled: boolean }> {
    // Stub deposits complete synchronously — no async callback to process yet.
    return { handled: true };
  }

  async createWithdrawal(): Promise<WithdrawalResult> {
    return { status: "MANUAL_PENDING" };
  }

  async verifyIdentity(): Promise<KycResult> {
    return { status: "UNVERIFIED" };
  }
}
