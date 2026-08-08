import { describe, expect, it } from "vitest";
import { bucketMatches } from "@/server/matches/scores";
import {
  EmbedOnlyStreamProvider,
  isValidChannel,
  refKey,
  type StreamProvider,
} from "@/server/streams/provider";

const m = (id: string, status: string) => ({ id, status });

describe("bucketMatches", () => {
  it("treats an in-progress or half-reported match as live", () => {
    const { live } = bucketMatches([
      m("a", "LIVE"),
      m("b", "AWAITING"),
      m("c", "SCHEDULED"),
    ]);
    expect(live.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("treats a scheduled match as upcoming", () => {
    const { upcoming } = bucketMatches([m("a", "SCHEDULED"), m("b", "LIVE")]);
    expect(upcoming.map((x) => x.id)).toEqual(["a"]);
  });

  it("counts only verified matches as completed", () => {
    const { completed } = bucketMatches([
      m("a", "VERIFIED"),
      m("b", "VOID"),
      m("c", "UNDER_REVIEW"),
    ]);
    expect(completed.map((x) => x.id)).toEqual(["a"]);
  });

  it("keeps contested matches out of every public bucket", () => {
    const buckets = bucketMatches([
      m("a", "UNDER_REVIEW"),
      m("b", "DISPUTED"),
      m("c", "VOID"),
    ]);
    expect(buckets.live).toEqual([]);
    expect(buckets.upcoming).toEqual([]);
    expect(buckets.completed).toEqual([]);
  });

  it("returns empty buckets for no matches", () => {
    expect(bucketMatches([])).toEqual({ live: [], upcoming: [], completed: [] });
  });

  it("puts every match in at most one bucket", () => {
    const all = ["LIVE", "AWAITING", "SCHEDULED", "VERIFIED"].map((s, i) =>
      m(`m${i}`, s),
    );
    const b = bucketMatches(all);
    const ids = [...b.live, ...b.upcoming, ...b.completed].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("EmbedOnlyStreamProvider", () => {
  // Typed as the interface: what matters is that it satisfies the contract a
  // real Twitch/YouTube implementation will have to satisfy too.
  const provider: StreamProvider = new EmbedOnlyStreamProvider();

  it("declares that live status is unavailable", () => {
    expect(provider.capabilities.liveStatus).toBe(false);
  });

  it("builds a Twitch embed that declares the parent host", () => {
    const url = provider.embedUrl(
      { platform: "TWITCH", channel: "someplayer" },
      "www.proplayturf.com",
    );
    expect(url).toContain("player.twitch.tv");
    expect(url).toContain("channel=someplayer");
    expect(url).toContain("parent=www.proplayturf.com");
  });

  it("builds a YouTube live embed", () => {
    expect(
      provider.embedUrl({ platform: "YOUTUBE", channel: "UC123" }, "host"),
    ).toContain("youtube.com/embed/live_stream?channel=UC123");
  });

  it("refuses to embed a channel name that isn't a plain handle", () => {
    expect(
      provider.embedUrl(
        { platform: "TWITCH", channel: "evil&parent=attacker.com" },
        "host",
      ),
    ).toBeNull();
  });

  it("reports no statuses rather than failing the polling job", async () => {
    expect(
      await provider.fetchStatuses([{ platform: "TWITCH", channel: "x" }]),
    ).toEqual(new Map());
  });
});

describe("isValidChannel", () => {
  it("accepts ordinary handles", () => {
    expect(isValidChannel("some_player-1")).toBe(true);
  });

  it("rejects anything that could smuggle URL syntax", () => {
    for (const bad of ["a b", "x/../y", "a?b=c", "a&b", "", "a".repeat(65)]) {
      expect(`${bad}=${isValidChannel(bad)}`).toBe(`${bad}=false`);
    }
  });
});

describe("refKey", () => {
  it("is case-insensitive on the channel", () => {
    expect(refKey({ platform: "TWITCH", channel: "AbC" })).toBe(
      refKey({ platform: "TWITCH", channel: "abc" }),
    );
  });

  it("separates the same name on different platforms", () => {
    expect(refKey({ platform: "TWITCH", channel: "x" })).not.toBe(
      refKey({ platform: "YOUTUBE", channel: "x" }),
    );
  });
});
