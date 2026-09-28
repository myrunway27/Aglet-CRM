import { describe, expect, it, vi } from "vitest";
import { PokemonTcgCatalog, mapApiCard, term } from "@/lib/catalog/pokemontcg";
import { parseClues } from "@/lib/match/parse";
import { RateLimitedError, UpstreamError } from "@/lib/server/errors";

// Synthetic records in the documented v2 card shape (test data, not real prices).
const apiCard = {
  id: "tst1-25",
  name: "Pikachu",
  number: "25",
  rarity: "Common",
  set: { id: "tst1", name: "Test Set", printedTotal: 198, ptcgoCode: "TST", releaseDate: "2026/01/01" },
  images: { small: "https://images.pokemontcg.io/tst1/25.png" },
  tcgplayer: { url: "https://prices.pokemontcg.io/tcgplayer/tst1-25", updatedAt: "2026/09/27", prices: { normal: { market: 0.2 } } },
  cardmarket: { url: "https://prices.pokemontcg.io/cardmarket/tst1-25", updatedAt: "2026/09/27", prices: { trendPrice: 0.1 } },
};

function setup(responses: Array<Response | Error>, extra: Partial<ConstructorParameters<typeof PokemonTcgCatalog>[0]> = {}) {
  const fetchImpl = vi.fn(async () => {
    const r = responses.shift();
    if (!r) throw new Error("no more responses");
    if (r instanceof Error) throw r;
    return r;
  });
  const cat = new PokemonTcgCatalog({
    baseUrl: "https://api.example.test/v2",
    apiKey: "secret-key",
    timeoutMs: 1000,
    perMinute: 30,
    perDay: 1000,
    catalogTtlMs: 60_000,
    priceTtlMs: 60_000,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async () => {},
    ...extra,
  });
  return { cat, fetchImpl };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("mapApiCard", () => {
  it("maps catalog fields and both price sources", () => {
    const c = mapApiCard(apiCard)!;
    expect(c).toMatchObject({ catalogId: "pokemontcg:tst1-25", setPrintedTotal: 198, setCode: "TST", finishes: ["normal"] });
    expect(c.prices.map((p) => `${p.source}:${p.currency}`).sort()).toEqual(["cardmarket:EUR", "tcgplayer:USD"]);
    expect(c.imageUrl).toBe("https://images.pokemontcg.io/tst1/25.png");
  });

  it("rejects malformed records and unsafe image hosts", () => {
    expect(mapApiCard({ id: "../x", name: "x" })).toBeNull();
    expect(mapApiCard({ ...apiCard, images: { small: "https://evil.test/a.png" } })!.imageUrl).toBeNull();
  });
});

describe("term()", () => {
  it("strips query operators from user text", () => {
    expect(term("name", 'pika" OR name:*')).toBe('name:"pika OR name"');
    expect(term("name", "pika", true)).toBe("name:pika*");
    expect(term("name", '"":*')).toBe("");
  });
});

describe("PokemonTcgCatalog", () => {
  it("sends the API key only as a header, never in the URL", async () => {
    const { cat, fetchImpl } = setup([ok({ data: [apiCard] })]);
    await cat.search("pikachu");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("secret-key");
    expect(new URL(url).searchParams.get("q")).toBe("name:pikachu*");
  });

  it("builds number + printed-total queries from scan clues", async () => {
    const { cat, fetchImpl } = setup([ok({ data: [apiCard] }), ok({ data: [] })]);
    const cards = await cat.findByClues(parseClues("Pikachu\n025/198"));
    const qs = fetchImpl.mock.calls.map((c) => new URL((c as unknown as [string])[0]).searchParams.get("q"));
    expect(qs).toEqual(["number:25 set.printedTotal:198", "name:Pikachu*"]);
    expect(cards).toHaveLength(1);
  });

  it("caches search results", async () => {
    const { cat, fetchImpl } = setup([ok({ data: [apiCard] })]);
    await cat.search("pikachu");
    await cat.search("pikachu");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("serves getCard from the cache populated by search", async () => {
    const { cat, fetchImpl } = setup([ok({ data: [apiCard] })]);
    await cat.search("pikachu");
    expect((await cat.getCard("pokemontcg:tst1-25"))?.name).toBe("Pikachu");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects foreign or malformed ids without calling out", async () => {
    const { cat, fetchImpl } = setup([]);
    expect(await cat.getCard("mock:demo-a-25")).toBeNull();
    expect(await cat.getCard("pokemontcg:../../admin")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null on 404", async () => {
    const { cat } = setup([new Response("{}", { status: 404 })]);
    expect(await cat.getCard("pokemontcg:nope-1")).toBeNull();
  });

  it("surfaces upstream 429 as RateLimitedError", async () => {
    const r429 = () => new Response("{}", { status: 429, headers: { "retry-after": "600" } });
    const { cat } = setup([r429()]);
    await expect(cat.search("pikachu")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("stops at the local per-minute budget before hitting the API", async () => {
    const { cat, fetchImpl } = setup([ok({ data: [] }), ok({ data: [] })], { perMinute: 1 });
    await cat.search("abc");
    await expect(cat.search("xyz")).rejects.toMatchObject({ scope: "local" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces provider failure as UpstreamError", async () => {
    const { cat } = setup([new Response("", { status: 500 }), new Response("", { status: 502 }), new Response("", { status: 503 })]);
    await expect(cat.search("pikachu")).rejects.toBeInstanceOf(UpstreamError);
  });
});
