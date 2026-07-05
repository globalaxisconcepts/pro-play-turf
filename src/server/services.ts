import { prisma } from "@/lib/db";
import { walletLock } from "@/lib/lock";
import { LedgerService } from "./ledger/ledger-service";
import { StubPaymentProvider } from "./payments/stub-provider";
import { WalletService } from "./wallet/wallet-service";

/**
 * App-wide service singletons, wired from the real Prisma client + configured
 * wallet lock. Tests do NOT import this — they construct services against a
 * PGlite-backed client and an in-process lock (see tests/helpers).
 */
export const ledgerService = new LedgerService(prisma, walletLock());
export const paymentProvider = new StubPaymentProvider(prisma, ledgerService);
export const walletService = new WalletService(prisma);
