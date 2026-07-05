import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/session";
import { provisionUser } from "@/server/provision";

/**
 * The current user. Backed by Firebase Auth session cookies (verified via the
 * Admin SDK, Node runtime). `auth()` keeps its original signature so existing
 * call sites — (app)/layout.tsx, wallet/page.tsx, wallet/actions.ts — are
 * unchanged; they now gain redirect-on-unauthenticated.
 *
 * Dev fallback: when Firebase isn't configured (no service-account key) and not
 * in production, resolve to the seeded demo player so the app stays runnable
 * offline. Setting FIREBASE_SERVICE_ACCOUNT_KEY switches on real auth.
 */
export const DEMO_USER_ID = "demo-player-user";

export interface Session {
  userId: string;
  role: "PLAYER" | "REVIEWER" | "ADMIN";
}

export async function getSession(): Promise<Session | null> {
  if (!isFirebaseAdminConfigured()) {
    return env.NODE_ENV === "production"
      ? null
      : { userId: DEMO_USER_ID, role: "PLAYER" };
  }

  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    return await provisionUser(decoded);
  } catch {
    return null; // expired / revoked / invalid
  }
}

export async function auth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/signin");
  return session;
}
