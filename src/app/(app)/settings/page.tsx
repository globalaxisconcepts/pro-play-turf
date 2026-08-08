import type { Metadata } from "next";
import { isDatabaseConfigured } from "@/lib/db";
import { auth } from "@/server/auth";
import { streamProvider, streamService } from "@/server/services";
import { StreamLinkForm } from "./_components/StreamLinkForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId } = await auth();
  const link = isDatabaseConfigured()
    ? await streamService.linkFor(userId)
    : null;

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Account</span>
        <h1>Settings</h1>
      </header>

      <section className="mr-panel">
        <h2>Streaming</h2>
        <p className="mr-hint">
          Link the channel you play on. Your stream appears on Watch, and your
          VODs stand as evidence when a result is questioned.
        </p>
        {!streamProvider.capabilities.liveStatus && (
          <p className="wallet-notice" style={{ marginTop: 14 }}>
            <span className="wallet-notice-ic" aria-hidden>
              ℹ️
            </span>
            <span>
              Live detection isn&apos;t switched on yet, so your channel
              won&apos;t be flagged as live automatically. Linking still works —
              your channel and VODs are shown either way.
            </span>
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <StreamLinkForm
            platform={link?.platform}
            channel={link?.channel}
          />
        </div>
      </section>
    </main>
  );
}
