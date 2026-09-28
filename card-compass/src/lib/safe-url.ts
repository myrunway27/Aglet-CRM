/**
 * Outbound links shown to users must point at known source hosts over https.
 * Anything else is dropped (no open redirects, no javascript: URLs).
 */
const ALLOWED_LINK_HOSTS = [
  "prices.pokemontcg.io",
  "tcgplayer.com",
  "www.tcgplayer.com",
  "cardmarket.com",
  "www.cardmarket.com",
];

const ALLOWED_IMAGE_HOSTS = ["images.pokemontcg.io"];

function check(raw: string | null | undefined, hosts: string[]): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return hosts.includes(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export const safeSourceUrl = (raw: string | null | undefined) => check(raw, ALLOWED_LINK_HOSTS);
export const safeImageUrl = (raw: string | null | undefined) => check(raw, ALLOWED_IMAGE_HOSTS);
