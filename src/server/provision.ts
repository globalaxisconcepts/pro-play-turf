import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { prisma } from "@/lib/db";
import { upsertMember } from "@/server/members/member-service";

export interface ProvisionResult {
  userId: string;
  role: "PLAYER" | "REVIEWER" | "ADMIN";
}

/**
 * Bridge a Firebase identity to app data on first sign-in. Creates BOTH the
 * Firestore member profile and the Postgres `User` anchor (keyed by
 * `firebaseUid`) + an empty `Wallet`. Race-safe via upserts on the unique keys.
 * Balances are NEVER written here — the wallet starts at 0 and only
 * LedgerService moves money.
 */
export async function provisionUser(
  decoded: DecodedIdToken,
): Promise<ProvisionResult> {
  const firebaseUid = decoded.uid;
  const email = decoded.email ?? null;
  const displayName =
    decoded.name ?? (email ? email.split("@")[0] : "Player") ?? "Player";
  const avatarUrl = (decoded.picture as string | undefined) ?? null;

  // Fast path: already provisioned — no writes.
  const existing = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true, role: true },
  });
  if (existing) {
    return { userId: existing.id, role: appRole(existing.role) };
  }

  // Postgres anchor + empty wallet (race-safe on the unique columns).
  const user = await prisma.user.upsert({
    where: { firebaseUid },
    update: {},
    create: {
      firebaseUid,
      email: email ?? `${firebaseUid}@firebase.local`,
      displayName,
    },
    select: { id: true, role: true },
  });
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  // Canonical member profile in Firestore.
  await upsertMember(firebaseUid, { displayName, email, avatarUrl });

  return { userId: user.id, role: appRole(user.role) };
}

function appRole(role: string): ProvisionResult["role"] {
  return role === "ADMIN" || role === "REVIEWER" ? role : "PLAYER";
}
