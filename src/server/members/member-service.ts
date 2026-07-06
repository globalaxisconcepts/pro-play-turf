import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * Member/profile data lives in Firestore (`members/{uid}`) and is the canonical
 * store for profile fields. All access is server-side via the Admin SDK;
 * `firestore.rules` denies direct client access.
 */
export interface MemberProfile {
  firebaseUid: string;
  email: string | null;
  displayName: string;
  role: "PLAYER" | "REVIEWER" | "ADMIN";
  platform: string | null;
  gamertag: string | null;
  avatarUrl: string | null;
}

const COLLECTION = "members";

export async function getMember(uid: string): Promise<MemberProfile | null> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(uid).get();
  return snap.exists ? (snap.data() as MemberProfile) : null;
}

/** Create the member doc on first sign-in, or merge updates on later ones. */
export async function upsertMember(
  uid: string,
  data: {
    displayName: string;
    email: string | null;
    avatarUrl?: string | null;
  },
): Promise<void> {
  const db = await getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.set(
      { ...data, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return;
  }
  await ref.set({
    firebaseUid: uid,
    role: "PLAYER",
    platform: null,
    gamertag: null,
    avatarUrl: data.avatarUrl ?? null,
    email: data.email,
    displayName: data.displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
