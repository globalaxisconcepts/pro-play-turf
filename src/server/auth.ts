import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo-users";
import { env } from "@/lib/env";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/session";
import { type AppRole, appRole } from "@/lib/roles";
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
export { DEMO_ADMIN_USER_ID, DEMO_USER_ID } from "@/lib/demo-users";

export interface Session {
  userId: string;
  role: AppRole;
}

/**
 * The offline session used when Firebase isn't configured (never in prod).
 * Resolves to DEV_SESSION_USER_ID or the seeded demo player, and reads the real
 * role off the User row so `DEV_SESSION_USER_ID=demo-admin-user` can reach
 * /admin. With no database there are no roles to read — stay a PLAYER.
 */
async function devSession(): Promise<Session> {
  const userId = env.DEV_SESSION_USER_ID?.trim() || DEMO_USER_ID;
  if (!isDatabaseConfigured()) return { userId, role: "PLAYER" };
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return { userId, role: appRole(user?.role ?? "PLAYER") };
  } catch {
    return { userId, role: "PLAYER" };
  }
}

export async function getSession(): Promise<Session | null> {
  if (!isFirebaseAdminConfigured()) {
    return env.NODE_ENV === "production" ? null : devSession();
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
