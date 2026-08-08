import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, safeExternalUrl } from "@/lib/urls";

describe("safeExternalUrl", () => {
  it("passes ordinary stream and VOD links through", () => {
    for (const url of [
      "https://twitch.tv/videos/12345",
      "http://example.com/clip",
      "https://www.youtube.com/watch?v=abc",
    ]) {
      expect(safeExternalUrl(url)).toBe(url);
    }
  });

  it("refuses schemes that execute or embed code", () => {
    // A javascript: href runs on click; rel="noopener" does nothing about it.
    for (const url of [
      "javascript:alert(document.cookie)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(`${url} -> ${safeExternalUrl(url)}`).toBe(`${url} -> null`);
    }
  });

  it("refuses anything that isn't a URL at all", () => {
    for (const url of ["", "not a url", "//evil.com", "   "]) {
      expect(safeExternalUrl(url)).toBeNull();
    }
  });

  it("handles missing values", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it("agrees with isSafeHttpUrl", () => {
    expect(isSafeHttpUrl("https://ok.test")).toBe(true);
    expect(isSafeHttpUrl("javascript:1")).toBe(false);
  });
});
