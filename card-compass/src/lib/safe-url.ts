/**
 * Source links come from third-party data. Only render https links to known
 * source hosts, so a poisoned record cannot become an open redirect or a
 * javascript: URL.
 */
const ALLOWED_HOSTS = new Set([
  "prices.pokemontcg.io",
  "www.tcgplayer.com",
  "tcgplayer.com",
  "shop.tcgplayer.com",
  "www.cardmarket.com",
  "cardmarket.com",
]);

export function safeSourceUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}

const IMAGE_HOSTS = new Set(["images.pokemontcg.io"]);

export function safeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && IMAGE_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}
