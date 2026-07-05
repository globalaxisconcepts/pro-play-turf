import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Firebase Admin SDK (Node-only, dynamic requires) out of the bundle.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
