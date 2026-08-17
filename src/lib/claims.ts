import "server-only";

// Email providers anyone can register at — an address there proves nothing
// about owning a business, even one whose name happens to match.
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "walla.co.il",
]);

// Domain labels that are generic infrastructure, not a business identity.
const GENERIC_LABELS = new Set([
  "www",
  "mail",
  "email",
  "info",
  "contact",
  "office",
  "co",
  "com",
  "net",
  "org",
  "biz",
  "shop",
  "store",
  "online",
  "site",
  "web",
]);

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Name variants a domain may reasonably use: "The Blue Fig Cafe" also
// matches bluefigcafe.com and bluefig.com (leading "the" and a trailing
// generic word dropped), never anything shorter.
function nameCandidates(businessName: string): string[] {
  const words = businessName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const variants = new Set<string>();
  const add = (ws: string[]) => {
    const joined = ws.join("");
    if (joined.length >= 4) variants.add(joined);
  };

  add(words);
  if (words[0] === "the") add(words.slice(1));
  const GENERIC_TAIL = new Set(["ltd", "llc", "inc", "gmbh", "restaurant", "cafe", "shop", "store", "salon", "studio", "bar", "group"]);
  if (words.length > 1 && GENERIC_TAIL.has(words[words.length - 1])) {
    add(words.slice(0, -1));
    if (words[0] === "the") add(words.slice(1, -1));
  }
  // Whole normalized name as a last resort (covers names with digits only)
  const whole = normalize(businessName);
  if (whole.length >= 4) variants.add(whole);
  return [...variants];
}

// True when `email` is at a domain that carries the business's name —
// e.g. anyone@bluefigcafe.com for "The Blue Fig Cafe". Free providers
// (gmail etc.) and generic labels never match.
export function emailMatchesBusiness(email: string, businessName: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain.includes(".") || FREE_MAIL_DOMAINS.has(domain)) return false;

  const labels = domain
    .split(".")
    .slice(0, -1) // the TLD is never an identity
    .map((l) => normalize(l))
    .filter((l) => l.length >= 4 && !GENERIC_LABELS.has(l));
  if (labels.length === 0) return false;

  const candidates = nameCandidates(businessName);
  return labels.some((label) => candidates.includes(label));
}

// A human hint for the claim form: the domain shape we'd accept.
export function expectedDomainHint(businessName: string): string | null {
  const [first] = nameCandidates(businessName);
  return first ? `${first}.com` : null;
}
