import { RateLimitedError, UpstreamError } from "../errors";
import { fetchJsonWithRetry, type FetchLike } from "../http";
import { log } from "../log";
import { parseMinor } from "../money";
import { OutboundLimiter } from "../rate-limit";
import { TtlCache } from "../cache";
import { safeImageUrl, safeSourceUrl } from "../safe-url";
import type { Listing, OfferProvider, OfferSearch } from "./types";

const API = "https://api.ebay.com";
const SCOPE = "https://api.ebay.com/oauth/api_scope";
/** "CCG Individual Cards" category. */
export const EBAY_CARD_CATEGORY = "183454";

interface Money {
  value?: string;
  currency?: string;
}
export interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: Money;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  itemLocation?: { country?: string };
  condition?: string;
  conditionId?: string;
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  shippingOptions?: Array<{ shippingCostType?: string; shippingCost?: Money }>;
  buyingOptions?: string[];
}
interface EbayItemDetail extends EbayItemSummary {
  conditionDescriptors?: Array<{ name?: string; values?: Array<{ content?: string }> }>;
}

export function mapSummary(s: EbayItemSummary, marketplace: string): Listing | null {
  const currency = s.price?.currency;
  const item = currency ? parseMinor(s.price?.value, currency) : null;
  if (!currency || item === null || item === 0) return null; // no usable price: skip, never invent
  const quotes = (s.shippingOptions ?? [])
    .map((o) => (o.shippingCost?.currency ? { minor: parseMinor(o.shippingCost.value, o.shippingCost.currency), currency: o.shippingCost.currency } : null))
    .filter((q): q is { minor: number; currency: string } => q !== null && q.minor !== null);
  const cheapest = quotes.sort((a, b) => a.minor - b.minor)[0];
  const pct = s.seller?.feedbackPercentage ? Number(s.seller.feedbackPercentage) : null;
  return {
    provider: "ebay",
    listingId: s.itemId,
    title: s.title,
    url: safeSourceUrl(s.itemWebUrl),
    imageUrl: safeImageUrl(s.image?.imageUrl),
    marketplace,
    itemMinor: item,
    itemCurrency: currency,
    shippingMinor: cheapest ? cheapest.minor : null,
    shippingCurrency: cheapest ? cheapest.currency : currency,
    itemCountry: s.itemLocation?.country ?? null,
    conditionId: s.conditionId ?? null,
    condition: s.condition ?? null,
    conditionDescriptors: [],
    sellerName: s.seller?.username ?? null,
    sellerFeedbackPct: pct !== null && Number.isFinite(pct) ? pct : null,
    sellerFeedbackScore: s.seller?.feedbackScore ?? null,
    priceKind: "asking",
    isDemo: false,
    enriched: false,
  };
}

export function buildEbayQuery(q: OfferSearch): string {
  const digits = q.setPrintedTotal ? String(q.setPrintedTotal).length : 0;
  const num = /^\d+$/.test(q.number) ? q.number.padStart(Math.max(digits, q.number.length), "0") : q.number;
  const parts = [q.cardName, q.setPrintedTotal && /^\d+$/.test(q.number) ? `${num}/${q.setPrintedTotal}` : num];
  if (q.grader && q.grader !== "Other") parts.push(q.grader, q.grade ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export interface EbayOptions {
  clientId: string;
  clientSecret: string;
  marketplaces: string[];
  perMinute: number;
  perDay: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * eBay Browse API (application token, client-credentials grant). Returns ACTIVE
 * fixed-price listings that ship to the buyer's country: asking prices, not
 * completed sales (those need the restricted Marketplace Insights API).
 */
export class EbayBrowseProvider implements OfferProvider {
  readonly id = "ebay" as const;
  private limiter: OutboundLimiter;
  private token: { value: string; expiresAt: number } | null = null;
  private detailCache = new TtlCache<Listing>(30 * 60_000, 0);

  constructor(private readonly opts: EbayOptions) {
    this.limiter = new OutboundLimiter(opts.perMinute, opts.perDay);
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    this.limiter.acquire();
    const basic = Buffer.from(`${this.opts.clientId}:${this.opts.clientSecret}`).toString("base64");
    const res = await fetchJsonWithRetry<{ access_token: string; expires_in: number }>(
      `${API}/identity/v1/oauth2/token`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }).toString(),
      },
      { timeoutMs: this.opts.timeoutMs ?? 8000, retries: 1, fetchImpl: this.opts.fetchImpl, sleep: this.opts.sleep },
    );
    this.token = { value: res.access_token, expiresAt: Date.now() + res.expires_in * 1000 };
    return res.access_token;
  }

  private async get<T>(url: string, marketplace: string, buyerCountry: string): Promise<T> {
    const token = await this.accessToken();
    this.limiter.acquire();
    try {
      return await fetchJsonWithRetry<T>(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": marketplace,
            // Lets eBay calculate shipping to the buyer's country.
            "X-EBAY-C-ENDUSERCTX": `contextualLocation=${encodeURIComponent(`country=${buyerCountry}`)}`,
          },
        },
        { timeoutMs: this.opts.timeoutMs ?? 8000, retries: 2, fetchImpl: this.opts.fetchImpl, sleep: this.opts.sleep },
      );
    } catch (err) {
      if (err instanceof RateLimitedError) this.limiter.cooldown(err.retryAfterSeconds);
      if (err instanceof UpstreamError && err.status === 401) this.token = null;
      throw err;
    }
  }

  async search(q: OfferSearch): Promise<Listing[]> {
    const query = buildEbayQuery(q);
    const all = new Map<string, Listing>();
    const errors: unknown[] = [];
    for (const marketplace of this.opts.marketplaces) {
      const url = new URL(`${API}/buy/browse/v1/item_summary/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("category_ids", EBAY_CARD_CATEGORY);
      url.searchParams.set("limit", "50");
      url.searchParams.set("filter", `buyingOptions:{FIXED_PRICE},deliveryCountry:${q.buyerCountry}`);
      try {
        const res = await this.get<{ itemSummaries?: EbayItemSummary[] }>(url.toString(), marketplace, q.buyerCountry);
        for (const s of res.itemSummaries ?? []) {
          const l = mapSummary(s, marketplace);
          if (l && !all.has(l.listingId)) all.set(l.listingId, l); // same item can appear on several marketplaces
        }
      } catch (err) {
        errors.push(err);
        log.warn("ebay.search_failed", { marketplace, name: err instanceof Error ? err.name : "unknown" });
      }
    }
    if (all.size === 0 && errors.length === this.opts.marketplaces.length && errors[0]) throw errors[0];
    return [...all.values()];
  }

  async enrich(listing: Listing): Promise<Listing> {
    const hit = this.detailCache.get(listing.listingId);
    if (hit) return hit.value;
    const d = await this.get<EbayItemDetail>(
      `${API}/buy/browse/v1/item/${encodeURIComponent(listing.listingId)}`,
      listing.marketplace,
      "US",
    );
    const enriched: Listing = {
      ...listing,
      condition: d.condition ?? listing.condition,
      conditionDescriptors: (d.conditionDescriptors ?? []).flatMap((c) => (c.values ?? []).map((v) => v.content ?? "")).filter(Boolean),
      enriched: true,
    };
    this.detailCache.set(listing.listingId, enriched);
    return enriched;
  }
}
