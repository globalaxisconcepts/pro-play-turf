/** The transaction's structure is invalid (missing id, too few entries, …). */
export class InvalidTxnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTxnError";
  }
}

/** The signed entry amounts do not net to zero — never allowed. */
export class UnbalancedTxnError extends Error {
  constructor(txnId: string) {
    super(`Ledger transaction ${txnId} is unbalanced (entries must sum to 0).`);
    this.name = "UnbalancedTxnError";
  }
}

/** A transaction with this id already exists — idempotency collision. */
export class DuplicateTxnError extends Error {
  constructor(txnId: string) {
    super(`Ledger transaction ${txnId} already applied.`);
    this.name = "DuplicateTxnError";
  }
}

/** The transaction would drive a user wallet bucket negative. */
export class InsufficientFundsError extends Error {
  constructor(walletId: string) {
    super(`Insufficient funds in wallet ${walletId}.`);
    this.name = "InsufficientFundsError";
  }
}
