/**
 * The boundary between the app's internal ledger and the outside money world.
 * Everything inside the app speaks to the ledger; only deposits/withdrawals/KYC
 * cross this interface. v1 ships `StubPaymentProvider` (test credits). Slice 13
 * drops in a real provider (e.g. Stripe Connect) behind the SAME interface with
 * no changes to league/card/prize/wallet code.
 */
export interface DepositIntent {
  status: "COMPLETED" | "PENDING";
  txnId: string;
  /** For real providers: something the client acts on (redirect / clientSecret). */
  clientAction?: { kind: "redirect" | "client_secret"; value: string };
}

export interface WithdrawalResult {
  status: "MANUAL_PENDING" | "PENDING" | "COMPLETED";
  payoutId?: string;
}

export interface KycResult {
  status: "UNVERIFIED" | "PENDING" | "VERIFIED";
}

export interface CreateDepositInput {
  userId: string;
  amountCents: bigint;
  /** Ledger reason for the resulting txn (e.g. DEPOSIT, ADMIN_GRANT). */
  reason?: string;
}

export interface PaymentProvider {
  readonly capabilities: { deposits: boolean; withdrawals: boolean; kyc: boolean };
  createDeposit(input: CreateDepositInput): Promise<DepositIntent>;
  /** Idempotent processing of a provider callback. */
  handleWebhook(payload: unknown): Promise<{ handled: boolean }>;
  createWithdrawal(input: {
    userId: string;
    amountCents: bigint;
    destination?: unknown;
  }): Promise<WithdrawalResult>;
  verifyIdentity(userId: string): Promise<KycResult>;
}
