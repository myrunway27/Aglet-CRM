import { NextResponse, type NextRequest } from "next/server";
import { catalog } from "@/lib/catalog";
import { buildReferenceView } from "@/lib/price/select";
import { CatalogIdSchema, SelectionSchema } from "@/lib/schemas";
import { handleRouteError, jsonError, toSummary } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { RateLimitedError, UpstreamError } from "@/lib/server/errors";
import { errInfo, log } from "@/lib/server/log";
import { loadSavedCard, saveSnapshots } from "@/lib/server/repo";
import type { CatalogCard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCLAIMER =
  "Informational reference prices published by third-party sources, shown in their original currency. " +
  "They are not live offers, may be stale, and do not include shipping, taxes or import duties.";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const idParsed = CatalogIdSchema.safeParse(decodeURIComponent(id));
  if (!idParsed.success) return jsonError(400, "bad_id", "Invalid card id.");
  const sp = req.nextUrl.searchParams;
  const sel = SelectionSchema.safeParse({
    finish: sp.get("finish") ?? undefined,
    language: sp.get("language") ?? undefined,
    grading: sp.get("grading") ?? undefined,
    condition: sp.get("condition") ?? undefined,
  });
  if (!sel.success) return jsonError(400, "bad_selection", "Choose a finish, language, grading and condition.");

  const catalogId = idParsed.data;
  const provider = catalog();
  let card: CatalogCard | null = null;
  let origin: "live" | "saved" | "demo" = provider.id === "mock" ? "demo" : "live";
  const notices: string[] = [];
  let unavailable: string | undefined;

  try {
    card = await provider.getCard(catalogId);
    if (card && origin === "live") await saveSnapshots(card);
  } catch (err) {
    if (!(err instanceof UpstreamError) && !(err instanceof RateLimitedError)) return handleRouteError("prices", err);
    log("warn", "prices.source_failed", errInfo(err));
    // Fall back to the last references we saved, clearly labeled.
    card = await loadSavedCard(catalogId);
    if (!card) return handleRouteError("prices", err);
    origin = "saved";
    if (card.prices.length > 0) {
      notices.push("The Pokémon TCG API is unavailable right now; showing the last references this app saved.");
    } else {
      unavailable = "The Pokémon TCG API is unavailable right now. Try again later.";
    }
  }
  if (!card) return jsonError(404, "not_found", "Card not found in the catalog.");

  const e = env();
  const view = buildReferenceView(card.prices, sel.data, {
    now: new Date(),
    staleAfterDays: e.PRICE_STALE_AFTER_DAYS,
    unavailable: unavailable ? { tcgplayer: unavailable, cardmarket: unavailable } : undefined,
  });
  view.notices.unshift(...notices);

  return NextResponse.json(
    {
      card: toSummary(card),
      selection: sel.data,
      origin,
      view,
      disclaimer: DISCLAIMER,
      attribution: "Card data and price references via the Pokémon TCG API (pokemontcg.io), sourced from TCGplayer and Cardmarket.",
      liveOffers: { enabled: false, reason: "No authorized live-listing feed is connected." },
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
