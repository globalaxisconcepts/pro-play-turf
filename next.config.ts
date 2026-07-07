import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Firebase Admin SDK (Node-only, dynamic requires) out of the bundle.
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        // Let Firebase's signInWithPopup keep a handle on the Google popup.
        // Without this, COOP severs the opener relationship, so the SDK can't
        // poll window.closed and throws a spurious error (seen as "Something
        // went wrong") even when sign-in actually succeeds — notably on Safari.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
