import type { PrismaClient, StreamPlatform } from "@prisma/client";
import { isValidChannel, refKey, type StreamProvider } from "./provider";

export class InvalidChannelError extends Error {
  constructor() {
    super("Use just the channel name or id — letters, numbers, dot, dash, underscore.");
    this.name = "InvalidChannelError";
  }
}

/**
 * Channel linking and the cached live state behind /watch.
 *
 * The cache is refreshed by a polling job and is stale by definition, so it
 * drives presentation only. Nothing that matters — a result, a payout — ever
 * depends on whether we think someone is live.
 */
export class StreamService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: StreamProvider,
  ) {}

  async link(input: {
    userId: string;
    platform: StreamPlatform;
    channel: string;
  }): Promise<void> {
    const channel = input.channel.trim();
    if (!isValidChannel(channel)) throw new InvalidChannelError();

    await this.prisma.streamLink.upsert({
      where: { userId: input.userId },
      update: {
        platform: input.platform,
        channel,
        // A new channel's live state is unknown until the next poll.
        isLive: false,
        title: null,
        viewers: null,
        checkedAt: null,
      },
      create: { userId: input.userId, platform: input.platform, channel },
    });
  }

  async unlink(userId: string): Promise<void> {
    await this.prisma.streamLink.deleteMany({ where: { userId } });
  }

  async linkFor(userId: string) {
    return this.prisma.streamLink.findUnique({ where: { userId } });
  }

  /** Channels we believe are live, most viewers first. */
  async listLive() {
    return this.prisma.streamLink.findMany({
      where: { isLive: true },
      orderBy: [{ viewers: "desc" }, { checkedAt: "desc" }],
      select: {
        id: true,
        userId: true,
        platform: true,
        channel: true,
        title: true,
        viewers: true,
        user: { select: { displayName: true } },
      },
    });
  }

  /** Every linked channel, for the polling job and the directory. */
  async listAll() {
    return this.prisma.streamLink.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        platform: true,
        channel: true,
        isLive: true,
        title: true,
        viewers: true,
        user: { select: { displayName: true } },
      },
    });
  }

  /**
   * Refresh live state for every linked channel. A no-op when the provider
   * can't answer, which is the default until a platform app is registered —
   * the job succeeds and simply changes nothing.
   */
  async refreshLiveStatus(): Promise<{ checked: number; live: number }> {
    if (!this.provider.capabilities.liveStatus) {
      return { checked: 0, live: 0 };
    }

    const links = await this.prisma.streamLink.findMany({
      select: { id: true, platform: true, channel: true },
    });
    if (links.length === 0) return { checked: 0, live: 0 };

    const statuses = await this.provider.fetchStatuses(
      links.map((l) => ({ platform: l.platform, channel: l.channel })),
    );

    let live = 0;
    const checkedAt = new Date();
    for (const link of links) {
      const status = statuses.get(
        refKey({ platform: link.platform, channel: link.channel }),
      );
      if (status?.isLive) live += 1;
      await this.prisma.streamLink.update({
        where: { id: link.id },
        data: {
          isLive: status?.isLive ?? false,
          title: status?.title ?? null,
          viewers: status?.viewers ?? null,
          checkedAt,
        },
      });
    }

    return { checked: links.length, live };
  }

  /** VOD links players attached as match evidence, newest first. */
  async listVods(take = 24) {
    return this.prisma.matchProof.findMany({
      where: { kind: "STREAM_URL" },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        url: true,
        createdAt: true,
        user: { select: { displayName: true } },
        match: {
          select: {
            id: true,
            status: true,
            round: true,
            league: { select: { name: true } },
            home: { select: { displayName: true } },
            away: { select: { displayName: true } },
          },
        },
      },
    });
  }
}
