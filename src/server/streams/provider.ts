import type { StreamPlatform } from "@prisma/client";

export interface StreamRef {
  platform: StreamPlatform;
  channel: string;
}

export interface StreamStatus {
  isLive: boolean;
  title?: string;
  viewers?: number;
}

/**
 * Talking to Twitch/YouTube.
 *
 * Embedding a channel needs no credentials — it's an iframe — so watching works
 * today. Knowing whether a channel is *live* needs the platform's API, which
 * needs a registered app. That half sits behind this interface exactly as
 * PaymentProvider does for money: swap the implementation, change nothing else.
 */
export interface StreamProvider {
  readonly capabilities: { liveStatus: boolean };
  /** Player URL for an embed, or null if the ref is unusable. */
  embedUrl(ref: StreamRef, parentHost: string): string | null;
  /** Public channel page, for a "watch on Twitch" link. */
  channelUrl(ref: StreamRef): string | null;
  /** Refresh live state. Returns an empty map when unavailable. */
  fetchStatuses(refs: StreamRef[]): Promise<Map<string, StreamStatus>>;
}

/** Key a status map by platform+channel. */
export function refKey(ref: StreamRef): string {
  return `${ref.platform}:${ref.channel.toLowerCase()}`;
}

/** Channel names are user input and end up in URLs — keep them boring. */
export function isValidChannel(channel: string): boolean {
  return /^[A-Za-z0-9_.-]{2,64}$/.test(channel);
}

/**
 * The default: embeds work, live status doesn't. Returns no statuses rather
 * than throwing, so the polling job degrades to a no-op instead of failing —
 * a stream that shows as offline is a much smaller problem than a broken job.
 */
export class EmbedOnlyStreamProvider implements StreamProvider {
  readonly capabilities = { liveStatus: false };

  embedUrl(ref: StreamRef, parentHost: string): string | null {
    if (!isValidChannel(ref.channel)) return null;
    const channel = encodeURIComponent(ref.channel);
    if (ref.platform === "TWITCH") {
      // Twitch refuses to render unless the embedding host is declared.
      return `https://player.twitch.tv/?channel=${channel}&parent=${encodeURIComponent(parentHost)}`;
    }
    return `https://www.youtube.com/embed/live_stream?channel=${channel}`;
  }

  channelUrl(ref: StreamRef): string | null {
    if (!isValidChannel(ref.channel)) return null;
    const channel = encodeURIComponent(ref.channel);
    return ref.platform === "TWITCH"
      ? `https://twitch.tv/${channel}`
      : `https://www.youtube.com/channel/${channel}`;
  }

  async fetchStatuses(): Promise<Map<string, StreamStatus>> {
    return new Map();
  }
}
