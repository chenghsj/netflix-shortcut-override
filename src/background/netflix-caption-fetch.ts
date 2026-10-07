/** Fetch only session-provided, HTTPS Netflix subtitle documents after a user click.
 * Runs in the extension background, where granted CDN host permissions apply.
 * It does not discover tracks, bypass DRM, or follow redirects to new origins.
 */
export const CAPTION_BYTE_LIMIT = 2_000_000;
const NETFLIX_HOSTS = ["netflix.com", "nflxvideo.net", "nflximg.net", "nflxext.com"] as const;

export class CaptionPermissionError extends Error {
  readonly code = 'CAPTION_PERMISSION_REQUIRED';
  constructor() {
    super('Netflix subtitle host access has not been granted.');
    this.name = 'CaptionPermissionError';
  }
}

export function isAllowedCaptionDeliveryUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      NETFLIX_HOSTS.some(domain => host === domain || host.endsWith("." + domain))
    );
  } catch {
    return false;
  }
}

export async function fetchNetflixCaptionText(
  url: string,
  fetchDocument: typeof fetch = fetch,
): Promise<string> {
  if (!isAllowedCaptionDeliveryUrl(url)) {
    // Never include the signed URL, query parameters, cookies, or response body
    // in a user-facing diagnostic. No network request is made for this input.
    let detail: string;
    try {
      const parsed = new URL(url);
      detail =
        parsed.protocol === "https:"
          ? "host " + parsed.hostname.toLowerCase()
          : "scheme " + parsed.protocol.replace(":", "");
    } catch {
      detail = "malformed URL";
    }
    throw new Error(
      "Netflix subtitle address rejected by the extension worker (" +
        detail +
        "). No network request was sent.",
    );
  }
  // MV3 host declarations can be withheld or revoked, especially in Firefox.
  // Check only the validated delivery origin; never request access implicitly.
  const origin = new URL(url).origin + '/*';
  if (!await chrome.permissions.contains({ origins: [origin] })) {
    throw new CaptionPermissionError();
  }
  let response: Response;
  try {
    response = await fetchDocument(url, {
      credentials: "include",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Netflix subtitle request timed out. Check your connection and retry.", { cause: error });
    }
    throw new Error(
      "Netflix subtitle request failed. Check your connection and retry.",
      { cause: error },
    );
  }
  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    throw new Error(
      "Netflix redirected the subtitle request; this extension will not follow an unverified subtitle address.",
    );
  }
  if (!response.ok) {
    throw new Error(
      "Netflix subtitle request failed (HTTP " +
        response.status +
        "). The current track may be unavailable or expired.",
    );
  }
  if (response.url && !isAllowedCaptionDeliveryUrl(response.url)) {
    throw new Error("Netflix subtitle request returned an unexpected address.");
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > CAPTION_BYTE_LIMIT) {
    throw new Error("Netflix subtitle document exceeds the 2 MB limit.");
  }
  if (!response.body) throw new Error("Netflix did not provide a readable subtitle document.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CAPTION_BYTE_LIMIT) {
        await reader.cancel();
        throw new Error("Netflix subtitle document exceeds the 2 MB limit.");
      }
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  if (!result.trim()) throw new Error("Netflix returned an empty subtitle document.");
  return result;
}
