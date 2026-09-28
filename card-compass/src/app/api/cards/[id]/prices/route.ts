import { errorResponse } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE, type CatalogCard } from "@/lib/catalog/types";
import { env } from "@/lib/env";
import { NotFoundError, RateLimitedError, UpstreamError } from "@/lib/errors";
import { log } from "@/lib/log";
import { SOURCES, toReferences, type SourceId, type SourceStatus } from "@/lib/prices";
import { loadStoredReferences, saveSnapshots } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/cards/[id]/prices">) {
  const { id } = await ctx.params;
  const e = env();
  const now = Date.now();
  try {
    if (!CATALOG_ID_RE.test(id)) throw new NotFoundError("Invalid card id");
    const catalog = getCatalog();
    try {
      const data = await catalog.getCard(id);
      const { references, sources } = toReferences(data, { now, staleAfterDays: e.PRICE_STALE_AFTER_DAYS });
      void saveSnapshots(data.card, references);
      return Response.json({
        mode: data.isDemo ? "mock" : "live",
        servedFrom: "source",
        card: data.card,
        references,
        sources,
        notices: [],
        fetchedAt: new Date(now).toISOString(),
      });
    } catch (err) {
      if (!(err instanceof UpstreamError || err instanceof RateLimitedError)) throw err;
      // Source down or rate-limited: fall back to the last stored references, clearly labeled.
      const stored = await loadStoredReferences(id, now, e.PRICE_STALE_AFTER_DAYS);
      if (!stored || stored.refs.length === 0) throw err;
      log.warn("prices.served_from_store", { reason: err.name });
      const card: CatalogCard = {
        catalogId: stored.card.catalogId,
        name: stored.card.name,
        number: stored.card.number,
        setId: stored.card.setId,
        setName: stored.card.setName,
        setSeries: null,
        setPrintedTotal: null,
        setPtcgoCode: null,
        releaseDate: null,
        rarity: stored.card.rarity,
        imageSmall: stored.card.imageUrl,
        imageLarge: stored.card.imageUrl,
        finishes: [...new Set(stored.refs.filter((r) => r.source === "tcgplayer").map((r) => r.finish))],
      };
      const sources: SourceStatus[] = (Object.keys(SOURCES) as SourceId[]).map((s) => {
        const r = stored.refs.find((x) => x.source === s);
        return {
          source: s,
          label: SOURCES[s].label,
          currency: SOURCES[s].currency,
          status: r ? "ok" : "no-quote",
          observedAt: r?.observedAt ?? null,
          sourceCardUrl: r?.sourceCardUrl ?? null,
          stale: r?.stale ?? false,
        };
      });
      return Response.json({
        mode: stored.refs.some((r) => r.isDemo) ? "mock" : "live",
        servedFrom: "stored",
        card,
        references: stored.refs,
        sources,
        notices: [
          "The Pokémon TCG API is unavailable right now, so these are the last references we stored. They may be out of date.",
        ],
        fetchedAt: new Date(now).toISOString(),
      });
    }
  } catch (err) {
    return errorResponse(err, "prices");
  }
}
