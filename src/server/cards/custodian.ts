import type { Prisma } from "@prisma/client";

/** The subset of the Prisma client a custodian needs inside a transaction. */
export type CardTx = Prisma.TransactionClient;

/**
 * Who actually holds a Pass.
 *
 * Today custody is a row in our own database. If Passes ever move to an
 * external custodian — an on-chain wallet, a partner vault — that swaps in
 * here and nothing else changes, exactly as PaymentProvider does for money.
 * No subsystem outside this module may write CardInstance.ownerUserId.
 */
export interface CardCustodian {
  readonly capabilities: { externalTransfer: boolean };

  /** Move a Pass between players. Must run inside the caller's transaction. */
  transfer(
    tx: CardTx,
    input: { instanceId: string; toUserId: string },
  ): Promise<void>;

  /** Destroy a Pass. Irreversible. */
  burn(tx: CardTx, input: { instanceId: string }): Promise<void>;
}

/** Custody in our own Postgres. The only implementation for now. */
export class InternalCardCustodian implements CardCustodian {
  readonly capabilities = { externalTransfer: false };

  async transfer(
    tx: CardTx,
    { instanceId, toUserId }: { instanceId: string; toUserId: string },
  ): Promise<void> {
    await tx.cardInstance.update({
      where: { id: instanceId },
      data: { ownerUserId: toUserId, status: "OWNED" },
    });
  }

  async burn(tx: CardTx, { instanceId }: { instanceId: string }): Promise<void> {
    await tx.cardInstance.update({
      where: { id: instanceId },
      data: { status: "SURRENDERED", surrenderedAt: new Date() },
    });
  }
}
