import type { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { LIMITS, type RateLimiter, type RateLimitRule } from "@/lib/rate-limit";
import {
  checkCompliance,
  CURRENT_TERMS_VERSION,
  type GateResult,
} from "./gate";

export class ActionBlockedError extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
    this.name = "ActionBlockedError";
  }
}

export class RateLimitedError extends Error {
  constructor(readonly resetMs: number) {
    super(
      `Too many attempts. Try again in ${Math.ceil(resetMs / 1000)} seconds.`,
    );
    this.name = "RateLimitedError";
  }
}

export type GuardedAction = Extract<keyof typeof LIMITS, string>;

/**
 * The single choke point every money-moving action passes through: is this
 * account allowed to transact, and is it going too fast?
 *
 * Deliberately one call rather than two, so a new action can't accidentally
 * check one and forget the other.
 */
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly limiter: RateLimiter,
  ) {}

  async recordFor(userId: string) {
    return this.prisma.userCompliance.findUnique({ where: { userId } });
  }

  async status(userId: string): Promise<GateResult> {
    return checkCompliance(await this.recordFor(userId), {
      minAgeYears: env.MIN_AGE_YEARS,
    });
  }

  /** Throws unless the user may perform this action right now. */
  async guard(userId: string, action: GuardedAction): Promise<void> {
    const gate = await this.status(userId);
    if (!gate.allowed) {
      throw new ActionBlockedError(
        gate.message ?? "This action isn't available on your account.",
        gate.reason ?? "BLOCKED",
      );
    }

    const rule: RateLimitRule = LIMITS[action];
    const result = await this.limiter.consume(`${action}:${userId}`, rule);
    if (!result.allowed) throw new RateLimitedError(result.resetMs);
  }

  /** Record the age and terms consent captured at signup. */
  async acceptTerms(input: {
    userId: string;
    dateOfBirth: Date;
    termsVersion?: string;
  }): Promise<void> {
    const data = {
      dateOfBirth: input.dateOfBirth,
      termsAcceptedAt: new Date(),
      termsVersion: input.termsVersion ?? CURRENT_TERMS_VERSION,
    };
    await this.prisma.userCompliance.upsert({
      where: { userId: input.userId },
      update: data,
      create: { userId: input.userId, ...data },
    });
  }

  /** Admin: stop an account transacting, with a reason on the record. */
  async restrict(input: {
    userId: string;
    actorUserId: string;
    reason: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userCompliance.upsert({
        where: { userId: input.userId },
        update: { restrictedAt: new Date(), restrictedReason: input.reason },
        create: {
          userId: input.userId,
          restrictedAt: new Date(),
          restrictedReason: input.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: "USER_RESTRICTED",
          entityType: "user",
          entityId: input.userId,
          detail: input.reason,
        },
      });
    });
  }

  async unrestrict(input: {
    userId: string;
    actorUserId: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userCompliance.updateMany({
        where: { userId: input.userId },
        data: { restrictedAt: null, restrictedReason: null },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: "USER_UNRESTRICTED",
          entityType: "user",
          entityId: input.userId,
        },
      });
    });
  }
}
