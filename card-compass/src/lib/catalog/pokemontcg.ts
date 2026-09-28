import { z } from "zod";
import type { ScanClues } from "../match/parse";
import { extractPriceReferences, finishesFromCard } from "../price/pokemontcg-prices";
import { safeImageUrl } from "../safe-url";
import { fetchJson } from "../server/http";
import { RequestBudget } from "../server/rate-limit";
import { TtlCache } from "../server/ttl-cache";
import type { CatalogCard } from "../types";
import { sanitizeQuery, splitQuery, type CatalogProvider } from "./provider";

/** Loose schema: only the fields we use; unknown fields are ignored. */
const ApiCard = z.object({
  id: z.string().regex(/^[A-Za-z0-9._-]+$/),
  name: z.string(),
  number: z.string(),
  rarity: z.string().optional(),
  set: z.object({
    id: z.string(),
    name: z.string(),
    printedTotal: z.number().optional(),
    ptcgoCode: z.string().optional(),
    releaseDate: z.string().optional(),
  }),
  images: z.object({ small: z.string().optional(), large: z.string().optional() }).optional(),
  tcgplayer: z.unknown().optional(),
  cardmarket: z.unknown().optional(),
});
const ListResponse = z.object({ data: z.array(z.unknown()) });
const OneResponse = z.object({ data: z.unknown() });

const SELECT = "id,name,number,rarity,set,images,tcgplayer,cardmarket";
const CARD_ID = /^[A-Za-z0-9._-]{1,64}$/;

export interface PokemonTcgConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  perMinute: number;
  perDay: number;
  catalogTtlMs: number;
  priceTtlMs: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export function mapApiCard(raw: unknown): CatalogCard | null {
  const parsed = ApiCard.safeParse(raw);
  if (!parsed.success) return null;
  const c = parsed.data;
  const finishes = finishesFromCard(raw);
  return {
    catalogId: `pokemontcg:${c.id}`,
    name: c.name,
    number: c.number,
    setId: c.set.id,
    setName: c.set.name,
    setPrintedTotal: c.set.printedTotal ?? null,
    setCode: c.set.ptcgoCode ?? null,
    setReleaseDate: c.set.releaseDate?.replace(/\//g, "-") ?? null,
    imageUrl: safeImageUrl(c.images?.small),
    rarity: c.rarity ?? null,
    finishes,
    prices: extractPriceReferences(raw, finishes, false),
  };
}

/** Lucene-style term for the Pokémon TCG API, with user text reduced to safe characters. */
export function term(field: string, value: string, wildcard = false): string {
  const v = value.replace(/["\\:()[\]{}^~*?!]/g, " ").replace(/\s+/g, " ").trim();
  if (!v) return "";
  if (!v.includes(" ")) return `${field}:${v}${wildcard ? "*" : ""}`;
  return `${field}:"${v}"`;
}

export class PokemonTcgCatalog implements CatalogProvider {
  readonly id = "pokemontcg" as const;
  private budget: RequestBudget;
  private listCache: TtlCache<CatalogCard[]>;
  private cardCache: TtlCache<CatalogCard | null>;

  constructor(private readonly cfg: PokemonTcgConfig) {
    this.budget = new RequestBudget(cfg.perMinute, cfg.perDay);
    this.listCache = new TtlCache(cfg.catalogTtlMs);
    // Card records carry price snapshots, so they use the (shorter) price TTL.
    this.cardCache = new TtlCache(cfg.priceTtlMs);
  }

  private async get(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(this.cfg.baseUrl.replace(/\/$/, "") + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    this.budget.take();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.cfg.apiKey) headers["X-Api-Key"] = this.cfg.apiKey;
    return fetchJson(url.toString(), {
      headers,
      timeoutMs: this.cfg.timeoutMs,
      fetchImpl: this.cfg.fetchImpl,
      sleep: this.cfg.sleep,
    });
  }

  private async query(q: string): Promise<CatalogCard[]> {
    if (!q) return [];
    const hit = this.listCache.get(q);
    if (hit) return hit;
    const json = ListResponse.parse(
      await this.get("/cards", { q, pageSize: "20", orderBy: "-set.releaseDate", select: SELECT }),
    );
    const cards = json.data.map(mapApiCard).filter((c): c is CatalogCard => c !== null);
    this.listCache.set(q, cards);
    for (const c of cards) this.cardCache.set(c.catalogId, c);
    return cards;
  }

  async findByClues(clues: ScanClues): Promise<CatalogCard[]> {
    const queries: string[] = [];
    if (clues.number) {
      const parts = [term("number", clues.number)];
      if (clues.printedTotal !== null) parts.push(`set.printedTotal:${clues.printedTotal}`);
      queries.push(parts.join(" "));
    }
    if (clues.name) queries.push(term("name", clues.name, true));
    const results = await Promise.all(queries.map((q) => this.query(q)));
    return results.flat();
  }

  async search(query: string): Promise<CatalogCard[]> {
    const q = sanitizeQuery(query);
    if (!q) return [];
    const { name, number, printedTotal } = splitQuery(q);
    const parts = [name ? term("name", name, true) : "", number ? term("number", number) : ""];
    if (printedTotal !== null) parts.push(`set.printedTotal:${printedTotal}`);
    return this.query(parts.filter(Boolean).join(" "));
  }

  async getCard(catalogId: string): Promise<CatalogCard | null> {
    const hit = this.cardCache.get(catalogId);
    if (hit !== undefined) return hit;
    const id = catalogId.replace(/^pokemontcg:/, "");
    if (!catalogId.startsWith("pokemontcg:") || !CARD_ID.test(id)) return null;
    try {
      const json = OneResponse.parse(await this.get(`/cards/${encodeURIComponent(id)}`, { select: SELECT }));
      const card = mapApiCard(json.data);
      this.cardCache.set(catalogId, card);
      return card;
    } catch (err) {
      if (err instanceof Error && "status" in err && (err as { status?: number }).status === 404) return null;
      throw err;
    }
  }
}
