import { prisma } from "@/lib/db";
import { walletLock } from "@/lib/lock";
import { LedgerService } from "./ledger/ledger-service";
import { JoinService } from "./leagues/join-service";
import { LeagueService } from "./leagues/league-service";
import { MatchService } from "./matches/match-service";
import { UnavailableProofStorage } from "./matches/proof-storage";
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
export const leagueService = new LeagueService(prisma);
export const joinService = new JoinService(prisma, ledgerService);
export const matchService = new MatchService(prisma);
/** Swap for a Blob/S3/R2 implementation to switch screenshot uploads on. */
export const proofStorage = new UnavailableProofStorage();
