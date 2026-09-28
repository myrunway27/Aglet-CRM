import { TtlCache } from "../cache";
import { NotFoundError, RateLimitedError, UpstreamError } from "../errors";
import { fetchJsonWithRetry, type FetchLike } from "../http";
import { log } from "../log";
import { OutboundLimiter } from "../rate-limit";
import {
  CATALOG_ID_RE,
  compareNumbers,
  SET_ID_RE,
  type CatalogCard,
  type CatalogCardWithPrices,
  type CatalogProvider,
  type CatalogSearchClues,
} from "./types";

/** Subset of the Pokémon TCG API v2 card object we rely on. */
export interface ApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    series?: string;
    printedTotal?: number;
    ptcgoCode?: string;
    releaseDate?: string;
  };
  images?: { small?: string; large?: string };
  tcgplayer?: CatalogCardWithPrices["tcgplayer"];
  cardmarket?: CatalogCardWithPrices["cardmarket"];
}

const SELECT = "id,name,number,rarity,set,images,tcgplayer,cardmarket";

export function mapApiCard(c: ApiCard): CatalogCard {
  return {
    catalogId: c.id,
    name: c.name,
    number: c.number,
    setId: c.set.id,
    setName: c.set.name,
    setSeries: c.set.series ?? null,
    setPrintedTotal: c.set.printedTotal ?? null,
    setPtcgoCode: c.set.ptcgoCode ?? null,
    releaseDate: c.set.releaseDate ?? null,
    rarity: c.rarity ?? null,
    imageSmall: c.images?.small ?? null,
    imageLarge: c.images?.large ?? null,
    finishes: Object.keys(c.tcgplayer?.prices ?? {}),
  };
}

/** Escape a term for the API's Lucene-like q syntax. Only letters, digits and a few separators survive. */
export function sanitizeTerm(term: string): string {
  return term
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} '.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function buildCluesQuery(clues: CatalogSearchClues): string | null {
  const parts: string[] = [];
  if (clues.number) parts.push(`number:${sanitizeTerm(clues.number).replace(/\s/g, "")}`);
  if (clues.setTotal) parts.push(`set.printedTotal:${Math.trunc(clues.setTotal)}`);
  if (clues.name) {
    const n = sanitizeTerm(clues.name);
    if (n) parts.push(`name:"${n}*"`);
  }
  return parts.length ? parts.join(" ") : null;
}

export interface PokemonTcgOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  perMinute: number;
  perDay: number;
  catalogTtlSeconds: number;
  priceTtlSeconds: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

export class PokemonTcgProvider implements CatalogProvider {
  readonly id = "pokemontcg" as const;
  private limiter: OutboundLimiter;
  private searchCache: TtlCache<CatalogCard[]>;
  private cardCache: TtlCache<CatalogCardWithPrices>;

  constructor(private readonly opts: PokemonTcgOptions) {
    this.limiter = new OutboundLimiter(opts.perMinute, opts.perDay);
    this.searchCache = new TtlCache(opts.catalogTtlSeconds * 1000, 86_400_000);
    this.cardCache = new TtlCache(opts.priceTtlSeconds * 1000, 7 * 86_400_000);
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(this.opts.baseUrl.replace(/\/$/, "") + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    this.limiter.acquire();
    const headers: Record<string, string> = { Accept: "application/json" };
    // Key goes in a header, never in the URL (keeps it out of logs).
    if (this.opts.apiKey) headers["X-Api-Key"] = this.opts.apiKey;
    try {
      return await fetchJsonWithRetry<T>(url.toString(), { headers }, {
        timeoutMs: this.opts.timeoutMs,
        retries: 2,
        fetchImpl: this.opts.fetchImpl,
        sleep: this.opts.sleep,
      });
    } catch (err) {
      if (err instanceof RateLimitedError) {
        this.limiter.cooldown(err.retryAfterSeconds);
        log.warn("pokemontcg.rate_limited", { retryAfter: err.retryAfterSeconds });
      } else if (err instanceof UpstreamError) {
        log.warn("pokemontcg.upstream_error", { status: err.status ?? null });
      }
      throw err;
    }
  }

  private async search(q: string): Promise<CatalogCard[]> {
    const hit = this.searchCache.get(q);
    if (hit?.fresh) return hit.value;
    try {
      const res = await this.get<{ data: ApiCard[] }>("/cards", {
        q,
        pageSize: "20",
        orderBy: "-set.releaseDate",
        select: SELECT,
      });
      const cards = res.data.map(mapApiCard);
      this.searchCache.set(q, cards);
      for (const c of res.data) this.cacheCard(c);
      return cards;
    } catch (err) {
      if (hit) return hit.value; // stale-if-error
      throw err;
    }
  }

  private cacheCard(c: ApiCard) {
    this.cardCache.set(c.id, {
      card: mapApiCard(c),
      tcgplayer: c.tcgplayer ?? null,
      cardmarket: c.cardmarket ?? null,
      isDemo: false,
    });
  }

  searchByClues(clues: CatalogSearchClues): Promise<CatalogCard[]> {
    const q = buildCluesQuery(clues);
    return q ? this.search(q) : Promise.resolve([]);
  }

  searchText(query: string): Promise<CatalogCard[]> {
    const m = /^\s*([A-Za-z]{0,4}\d{1,3})\s*\/\s*([A-Za-z]{0,4}\d{1,3})\s*$/.exec(query);
    if (m) {
      const total = Number(m[2]);
      return this.searchByClues({
        number: m[1].replace(/^0+(?=\d)/, ""),
        setTotal: Number.isFinite(total) ? total : undefined,
      });
    }
    const term = sanitizeTerm(query);
    return term ? this.search(`name:"${term}*"`) : Promise.resolve([]);
  }

  async getCards(catalogIds: string[]): Promise<CatalogCard[]> {
    const ids = [...new Set(catalogIds)].filter((id) => CATALOG_ID_RE.test(id));
    const out: CatalogCard[] = [];
    const missing: string[] = [];
    for (const id of ids) {
      const hit = this.cardCache.get(id);
      if (hit?.fresh) out.push(hit.value.card);
      else missing.push(id);
    }
    // One request per 50 ids: q=(id:"a" OR id:"b" ...)
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const res = await this.get<{ data: ApiCard[] }>("/cards", {
        q: `(${chunk.map((id) => `id:"${id}"`).join(" OR ")})`,
        pageSize: "50",
        select: SELECT,
      });
      for (const c of res.data) {
        this.cacheCard(c);
        out.push(mapApiCard(c));
      }
    }
    return out;
  }

  async listSet(setId: string): Promise<CatalogCard[]> {
    if (!SET_ID_RE.test(setId)) return [];
    const key = `set:${setId}`;
    const hit = this.searchCache.get(key);
    if (hit?.fresh) return hit.value;
    try {
      const all: CatalogCard[] = [];
      for (let page = 1; page <= 4; page++) {
        const res = await this.get<{ data: ApiCard[]; totalCount?: number }>("/cards", {
          q: `set.id:${setId}`,
          pageSize: "250",
          page: String(page),
          select: SELECT,
        });
        for (const c of res.data) this.cacheCard(c);
        all.push(...res.data.map(mapApiCard));
        if (res.data.length < 250 || (res.totalCount !== undefined && all.length >= res.totalCount)) break;
      }
      all.sort((a, b) => compareNumbers(a.number, b.number));
      this.searchCache.set(key, all);
      return all;
    } catch (err) {
      if (hit) return hit.value;
      throw err;
    }
  }

  async getCard(catalogId: string): Promise<CatalogCardWithPrices> {
    if (!CATALOG_ID_RE.test(catalogId)) throw new NotFoundError("Invalid card id");
    const hit = this.cardCache.get(catalogId);
    if (hit?.fresh) return hit.value;
    try {
      const res = await this.get<{ data: ApiCard }>(`/cards/${encodeURIComponent(catalogId)}`, {
        select: SELECT,
      });
      this.cacheCard(res.data);
      return this.cardCache.get(catalogId)!.value;
    } catch (err) {
      if (err instanceof UpstreamError && err.status === 404) throw new NotFoundError("Card not found");
      if (hit) return hit.value;
      throw err;
    }
  }
}
