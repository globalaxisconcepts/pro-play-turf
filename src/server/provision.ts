import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { upsertMember } from "@/server/members/member-service";

export interface ProvisionResult {
  userId: string;
  role: "PLAYER" | "REVIEWER" | "ADMIN";
}

/**
 * Bridge a Firebase identity to app data on sign-in. Always mirrors the profile
 * into the Firestore member doc; provisions the Postgres `User` anchor + empty
 * `Wallet` ONLY when a database is configured. Balances are NEVER written here.
 *
 * Fail-soft: neither a Firestore hiccup nor an absent/misconfigured Postgres
 * breaks auth. Without a DB, the Firebase uid is the identity for now; once a
 * real DATABASE_URL is wired, the Postgres user+wallet are created lazily on the
 * next request (this runs on every authenticated request via getSession()).
 */
export async function provisionUser(
  decoded: DecodedIdToken,
): Promise<ProvisionResult> {
  const firebaseUid = decoded.uid;
  const email = decoded.email ?? null;
  const displayName =
    decoded.name ?? (email ? email.split("@")[0] : "Player") ?? "Player";
  const avatarUrl = (decoded.picture as string | undefined) ?? null;

  // Canonical member profile in Firestore — best-effort (never break auth).
  try {
    await upsertMember(firebaseUid, { displayName, email, avatarUrl });
  } catch (err) {
    console.error("[provision] Firestore member upsert failed:", err);
  }

  // No Postgres yet → use the Firebase uid as the identity for now.
  if (!isDatabaseConfigured()) {
    return { userId: firebaseUid, role: "PLAYER" };
  }

  try {
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
    return { userId: user.id, role: appRole(user.role) };
  } catch (err) {
    // Stubborn / half-configured DB must not break sign-in — fall back to the
    // Firebase identity; provisioning resumes automatically once the DB works.
    console.error("[provision] Postgres provisioning failed:", err);
    return { userId: firebaseUid, role: "PLAYER" };
  }
}

function appRole(role: string): ProvisionResult["role"] {
  return role === "ADMIN" || role === "REVIEWER" ? role : "PLAYER";
}
