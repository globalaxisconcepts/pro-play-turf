import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/session";

/**
 * Cheap UX gate for the app section. In Next 16 `proxy.ts` runs on the Node
 * runtime, so it can read server env — but we keep it to a cookie-PRESENCE
 * check; the authoritative verification is `auth()` in (app)/layout.tsx.
 *
 * Mirrors auth()'s dev fallback: when Firebase isn't configured and not in
 * production, let requests through (the demo player).
 */
export function proxy(req: NextRequest) {
  const firebaseConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  const isProd = process.env.NODE_ENV === "production";
  if (!firebaseConfigured && !isProd) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("returnTo", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/wallet", "/wallet/:path*"],
};
