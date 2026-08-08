/**
 * URL safety for links that came from users — stream channels, VODs, dispute
 * evidence.
 *
 * Validating on write is not enough on its own: a `javascript:` href executes
 * when clicked, `rel="noopener"` does nothing to stop it, and a second write
 * path added later would silently turn stored data into stored XSS. So every
 * render site re-checks, and anything that isn't plain http(s) is shown as
 * text rather than linked.
 */

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** The URL if it's safe to put in an href, otherwise null. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return isSafeHttpUrl(url) ? url : null;
}
