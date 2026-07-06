import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
// Firestore is imported for its TYPE only (erased at runtime). The value module
// (`firebase-admin/firestore`) pulls in the heavy gRPC stack, which can fail to
// load on serverless at cold start — so it is loaded lazily in
// getAdminFirestore() and never touches the REST-only auth path.
import type { Firestore } from "firebase-admin/firestore";
import { env } from "@/lib/env";

/**
 * Firebase Admin SDK — Node runtime ONLY (never Edge). Lazily initialized on
 * first use so module import + `next build` stay safe with placeholder env; if
 * the service-account key is missing it throws a clear error at first call
 * (mirrors db.ts / redis.ts), never at module top level.
 */
let app: App | null = null;
let firestore: Firestore | null = null;

function parseServiceAccount(raw: string): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} {
  let json = raw.trim();
  // Accept base64-encoded JSON (recommended — avoids .env newline mangling) or raw JSON.
  if (!json.startsWith("{")) {
    json = Buffer.from(json, "base64").toString("utf8");
  }
  const parsed = JSON.parse(json) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length) {
    app = existing[0]!;
    return app;
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY " +
        "(base64 of the service-account JSON).",
    );
  }
  app = initializeApp({ credential: cert(parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
  return app;
}

/** True when Admin can be initialized (key present or an app already exists). */
export function isFirebaseAdminConfigured(): boolean {
  return Boolean(env.FIREBASE_SERVICE_ACCOUNT_KEY) || getApps().length > 0;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Firestore is loaded lazily (dynamic import) so the gRPC stack never lands in
 * the auth cold-start path, and configured for REST transport (`preferRest`) —
 * both to keep it serverless-friendly. Cached after first init.
 */
export async function getAdminFirestore(): Promise<Firestore> {
  if (firestore) return firestore;
  const { getFirestore } = await import("firebase-admin/firestore");
  firestore = getFirestore(getAdminApp());
  try {
    firestore.settings({ preferRest: true });
  } catch {
    // settings() can only be applied once, before first use — ignore if already set.
  }
  return firestore;
}
