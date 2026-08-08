-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'REVIEWER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Bucket" AS ENUM ('AVAILABLE', 'ESCROW', 'HOUSE', 'PRIZE_POOL');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('AMATEUR', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'CHAMPIONS');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('OPEN', 'FILLING', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "StandingOutcome" AS ENUM ('PROMOTED', 'RELEGATED', 'STAYED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('OWNED', 'LISTED', 'SURRENDERED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StreamPlatform" AS ENUM ('TWITCH', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('ACTIVE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'AWAITING', 'VERIFIED', 'UNDER_REVIEW', 'DISPUTED', 'VOID');

-- CreateEnum
CREATE TYPE "ProofKind" AS ENUM ('SCREENSHOT', 'STREAM_URL');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UPHELD', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "firebaseUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompliance" (
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "restrictedAt" TIMESTAMP(3),
    "restrictedReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompliance_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableCents" BIGINT NOT NULL DEFAULT 0,
    "escrowCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bucket" "Bucket" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "previousSeasonId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "won" INTEGER NOT NULL,
    "drawn" INTEGER NOT NULL,
    "lost" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "outcome" "StandingOutcome" NOT NULL DEFAULT 'STAYED',
    "nextDivisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardType" (
    "id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "name" TEXT NOT NULL,
    "qualifier" TEXT NOT NULL,
    "faceValueCents" BIGINT NOT NULL DEFAULT 0,
    "maxSupply" INTEGER,
    "minted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInstance" (
    "id" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'OWNED',
    "mintedForLeagueId" TEXT,
    "mintedPosition" INTEGER,
    "surrenderedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardListing" (
    "id" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "priceCents" BIGINT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "buyerUserId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTxn" (
    "id" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "priceCents" BIGINT NOT NULL DEFAULT 0,
    "feeCents" BIGINT NOT NULL DEFAULT 0,
    "ledgerTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "StreamPlatform" NOT NULL,
    "channel" TEXT NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "viewers" INTEGER,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyInCents" BIGINT NOT NULL DEFAULT 0,
    "rakeBps" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 16,
    "status" "LeagueStatus" NOT NULL DEFAULT 'OPEN',
    "startsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "homeUserId" TEXT NOT NULL,
    "awayUserId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSubmission" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchProof" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProofKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchDispute" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MatchDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueEntry" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "escrowTxnId" TEXT,
    "buyInCents" BIGINT NOT NULL DEFAULT 0,
    "status" "EntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_txnId_idx" ON "LedgerEntry"("txnId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_previousSeasonId_key" ON "Season"("previousSeasonId");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "Standing_leagueId_idx" ON "Standing"("leagueId");

-- CreateIndex
CREATE INDEX "Standing_userId_idx" ON "Standing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_leagueId_userId_key" ON "Standing"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardType_tier_key" ON "CardType"("tier");

-- CreateIndex
CREATE INDEX "CardInstance_ownerUserId_status_idx" ON "CardInstance"("ownerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CardInstance_cardTypeId_serial_key" ON "CardInstance"("cardTypeId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "CardInstance_mintedForLeagueId_ownerUserId_key" ON "CardInstance"("mintedForLeagueId", "ownerUserId");

-- CreateIndex
CREATE INDEX "CardListing_status_idx" ON "CardListing"("status");

-- CreateIndex
CREATE INDEX "CardListing_cardInstanceId_idx" ON "CardListing"("cardInstanceId");

-- CreateIndex
CREATE INDEX "CardListing_sellerUserId_idx" ON "CardListing"("sellerUserId");

-- CreateIndex
CREATE INDEX "CardTxn_cardInstanceId_idx" ON "CardTxn"("cardInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamLink_userId_key" ON "StreamLink"("userId");

-- CreateIndex
CREATE INDEX "StreamLink_isLive_idx" ON "StreamLink"("isLive");

-- CreateIndex
CREATE INDEX "Division_seasonId_idx" ON "Division"("seasonId");

-- CreateIndex
CREATE INDEX "League_divisionId_idx" ON "League"("divisionId");

-- CreateIndex
CREATE INDEX "League_status_idx" ON "League"("status");

-- CreateIndex
CREATE INDEX "Match_leagueId_status_idx" ON "Match"("leagueId", "status");

-- CreateIndex
CREATE INDEX "Match_homeUserId_idx" ON "Match"("homeUserId");

-- CreateIndex
CREATE INDEX "Match_awayUserId_idx" ON "Match"("awayUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_leagueId_homeUserId_awayUserId_key" ON "Match"("leagueId", "homeUserId", "awayUserId");

-- CreateIndex
CREATE INDEX "MatchSubmission_matchId_idx" ON "MatchSubmission"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSubmission_matchId_userId_key" ON "MatchSubmission"("matchId", "userId");

-- CreateIndex
CREATE INDEX "MatchProof_matchId_idx" ON "MatchProof"("matchId");

-- CreateIndex
CREATE INDEX "MatchDispute_status_idx" ON "MatchDispute"("status");

-- CreateIndex
CREATE INDEX "MatchDispute_matchId_idx" ON "MatchDispute"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchDispute_matchId_raisedByUserId_key" ON "MatchDispute"("matchId", "raisedByUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LeagueEntry_leagueId_status_idx" ON "LeagueEntry"("leagueId", "status");

-- CreateIndex
CREATE INDEX "LeagueEntry_userId_idx" ON "LeagueEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueEntry_leagueId_userId_key" ON "LeagueEntry"("leagueId", "userId");

-- AddForeignKey
ALTER TABLE "UserCompliance" ADD CONSTRAINT "UserCompliance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardListing" ADD CONSTRAINT "CardListing_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "CardInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardListing" ADD CONSTRAINT "CardListing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTxn" ADD CONSTRAINT "CardTxn_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "CardInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamLink" ADD CONSTRAINT "StreamLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeUserId_fkey" FOREIGN KEY ("homeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayUserId_fkey" FOREIGN KEY ("awayUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubmission" ADD CONSTRAINT "MatchSubmission_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubmission" ADD CONSTRAINT "MatchSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchProof" ADD CONSTRAINT "MatchProof_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchProof" ADD CONSTRAINT "MatchProof_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDispute" ADD CONSTRAINT "MatchDispute_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

