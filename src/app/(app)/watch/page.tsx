import type { Metadata } from "next";
import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db";
import { safeExternalUrl } from "@/lib/urls";
import { streamProvider, streamService } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Watch",
  description: "Live matches and match VODs from Pro Play Turf players.",
};

/** Twitch refuses to render an embed unless the host is declared. */
const PARENT_HOST = process.env.NEXT_PUBLIC_SITE_HOST ?? "www.proplayturf.com";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = raw === "vods" ? "vods" : "live";

  const ready = isDatabaseConfigured();
  const [live, vods] = await Promise.all([
    ready ? streamService.listLive() : [],
    ready ? streamService.listVods() : [],
  ]);

  const statusUnavailable = !streamProvider.capabilities.liveStatus;

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">Broadcast</span>
        <h1>Watch</h1>
        <p>
          Players stream their matches, and the VODs become the evidence behind
          every result. Link your own channel in settings to appear here.
        </p>
      </header>

      <nav className="lg-tabs" aria-label="Watch sections">
        <Link
          href="/watch"
          className="lg-tab"
          aria-current={tab === "live" ? "page" : undefined}
        >
          Live ({live.length})
        </Link>
        <Link
          href="/watch?tab=vods"
          className="lg-tab"
          aria-current={tab === "vods" ? "page" : undefined}
        >
          VODs ({vods.length})
        </Link>
      </nav>

      <section className="lg-tab-panel">
        {tab === "live" ? (
          live.length === 0 ? (
            <div className="empty">
              <div className="ic" aria-hidden>
                📺
              </div>
              <h3>No live matches right now</h3>
              <p>
                {statusUnavailable
                  ? "Live detection isn't switched on yet, so channels won't show as live even when they are. Browse the VODs instead."
                  : "Nobody's streaming at the moment — browse the VODs instead."}
              </p>
              <Link
                href="/watch?tab=vods"
                className="btn btn-ghost"
                style={{ marginTop: 16 }}
              >
                Browse VODs
              </Link>
            </div>
          ) : (
            <div className="watch-grid">
              {live.map((s) => {
                const embed = streamProvider.embedUrl(
                  { platform: s.platform, channel: s.channel },
                  PARENT_HOST,
                );
                return (
                  <article key={s.id} className="watch-card">
                    {embed && (
                      <div className="watch-embed">
                        <iframe
                          src={embed}
                          title={`${s.user.displayName} live`}
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="watch-meta">
                      <span className="lg-badge" data-status="LIVE">
                        <span className="lg-dot" aria-hidden />
                        Live
                      </span>
                      <strong>{s.user.displayName}</strong>
                      {s.title && <p className="mr-hint">{s.title}</p>}
                      {s.viewers != null && (
                        <p className="store-provenance">
                          {s.viewers.toLocaleString()} watching
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : vods.length === 0 ? (
          <div className="empty">
            <div className="ic" aria-hidden>
              🎬
            </div>
            <h3>No VODs yet</h3>
            <p>
              When players attach a stream link as match evidence, it shows up
              here.
            </p>
          </div>
        ) : (
          <ol className="lg-fixtures">
            {vods.map((v) => {
              // Re-checked at render: a stored non-http(s) URL is shown as
              // text, never as a clickable href.
              const href = safeExternalUrl(v.url);
              return (
                <li key={v.id}>
                  <div className="lg-fixture">
                    <span className="lg-fixture-teams">
                      <span>{v.match.home.displayName}</span>
                      <span className="lg-fixture-score">vs</span>
                      <span>{v.match.away.displayName}</span>
                    </span>
                    <span className="sc-league">{v.match.league.name}</span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="btn btn-ghost"
                      >
                        Watch VOD
                      </a>
                    ) : (
                      <span className="mr-hint">Unavailable link</span>
                    )}
                    <Link href={`/matches/${v.match.id}`} className="rv-link">
                      Match →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
