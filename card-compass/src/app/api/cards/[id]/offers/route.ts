import { errorResponse } from "@/lib/api";
import { TtlCache } from "@/lib/cache";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { env } from "@/lib/env";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getFx } from "@/lib/fx";
import { getOfferProvider } from "@/lib/offers";
import { evaluateOffers, type OffersResult } from "@/lib/offers/service";
import { isRegion, REGIONS } from "@/lib/regions";
import { Selection, selectionToQuery } from "@/lib/selection";

export const runtime = "nodejs";

// Short cache: listing prices and stock change quickly.
const cache = new TtlCache<OffersResult>(10 * 60_000, 0, 500);

export async function GET(req: Request, ctx: RouteContext<"/api/cards/[id]/offers">) {
  try {
    const { id } = await ctx.params;
    if (!CATALOG_ID_RE.test(id)) throw new NotFoundError("Invalid card id");
    const provider = getOfferProvider();
    if (!provider) {
      return Response.json(
        { error: { code: "offers_disabled", message: "Live offers are not enabled on this server." } },
        { status: 503 },
      );
    }
    const sp = new URL(req.url).searchParams;
    const country = sp.get("country") ?? "US";
    if (!isRegion(country)) throw new ValidationError("Unsupported country.");
    const sel = Selection.safeParse(Object.fromEntries([...sp.entries()].filter(([k]) => k !== "country")));
    if (!sel.success) throw new ValidationError("Confirm the card's finish, language and condition first.");

    const key = `${provider.id}|${id}|${country}|${selectionToQuery(sel.data)}`;
    const hit = cache.get(key);
    if (hit?.fresh) return Response.json(hit.value);

    const e = env();
    const [{ card }, fx] = await Promise.all([getCatalog().getCard(id), getFx().getRates()]);
    const result = await evaluateOffers({
      provider,
      card,
      selection: sel.data,
      buyerCountry: country,
      buyerCurrency: REGIONS[country].currency,
      fx,
      policy: { minFeedbackPct: e.EBAY_MIN_FEEDBACK_PCT, minFeedbackScore: e.EBAY_MIN_FEEDBACK_SCORE },
      now: Date.now(),
    });
    cache.set(key, result);
    return Response.json(result);
  } catch (err) {
    return errorResponse(err, "offers");
  }
}
