import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session";
import { provisionUser } from "@/server/provision";

// Admin SDK is Node-only.
export const runtime = "nodejs";

/**
 * POST { idToken } — verify a freshly-minted Firebase ID token, provision the
 * app user, and mint an httpOnly session cookie. The ID token travels in the
 * request BODY (not a cookie), which is itself the primary CSRF defense.
 */
export async function POST(req: Request) {
  let idToken: unknown;
  try {
    idToken = (await req.json())?.idToken;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    await provisionUser(decoded);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }
}

/** DELETE — sign out: clear the session cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
