import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { ValidationError } from "@/lib/errors";
import { convertMinor, fxUsable } from "@/lib/fx/convert";
import { getFx } from "@/lib/fx";
import { valueCollection } from "@/lib/jobs";
import { CURRENCIES, parseMinor } from "@/lib/money";
import { itemPnl, totalPnl } from "@/lib/pnl";
import { isRegion, REGIONS } from "@/lib/regions";
import { Selection } from "@/lib/selection";
import { totalCollection } from "@/lib/valuation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const client = requireDb();
    const now = Date.now();
    const sp = new URL(req.url).searchParams;
    const binder = sp.get("binder") ?? "all"; // "all" | "none" | binder id
    const country = sp.get("country") ?? user.country;
    const currency = isRegion(country) ? REGIONS[country].currency : "USD";

    const [result, binders, fx] = await Promise.all([
      valueCollection(user.id, now), // values everything and snapshots the whole collection
      client.binder.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
      getFx().getRates().catch(() => null),
    ]);
    const valued = result!.valued.filter((v) =>
      binder === "all" ? true : binder === "none" ? v.item.binderId === null : v.item.binderId === binder,
    );
    const totals = totalCollection(valued);
    const pnlInputs = valued.map((v) => ({ ...v.item, valuation: v.valuation }));
    const pnl = totals.map((t) => totalPnl(pnlInputs, t.source, t.currency, fx, now));
    const converted =
      fx && fxUsable(fx, now)
        ? totals.map((t) => ({ source: t.source, amountMinor: convertMinor(t.amountMinor, t.currency, currency, fx) }))
        : [];
    const history = await client.collectionValueSnapshot.findMany({ where: { userId: user.id }, orderBy: { day: "asc" }, take: 400 });

    return Response.json({
      binder,
      binders: binders.map((b) => ({ id: b.id, name: b.name })),
      items: valued.map((v) => ({
        ...v.item,
        valuation: v.valuation,
        fromStore: v.fromStore,
        pnl: {
          tcgplayer: itemPnl({ ...v.item, valuation: v.valuation }, "tcgplayer", fx, now),
          cardmarket: itemPnl({ ...v.item, valuation: v.valuation }, "cardmarket", fx, now),
        },
      })),
      totals,
      pnl,
      converted: { currency, fxDate: fx?.date ?? null, fxSource: fx?.source ?? null, values: converted },
      // History is for the whole collection (snapshots aren't per binder).
      history: history.map((h) => ({ day: h.day.toISOString().slice(0, 10), source: h.source, currency: h.currency, amountMinor: h.amountMinor, itemsPriced: h.itemsPriced, itemsTotal: h.itemsTotal })),
    });
  } catch (err) {
    return errorResponse(err, "collection.get");
  }
}

const AddItem = z.object({
  catalogId: z.string().regex(CATALOG_ID_RE),
  selection: Selection,
  quantity: z.number().int().min(1).max(999).default(1),
  purchasePrice: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).optional(),
  purchaseCurrency: z.enum(CURRENCIES).optional(),
  binderId: z.string().max(40).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = AddItem.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid item.");
    const { catalogId, selection: s, quantity, purchasePrice, purchaseCurrency, binderId } = body.data;
    if (Boolean(purchasePrice) !== Boolean(purchaseCurrency)) throw new ValidationError("Give both a purchase price and its currency.");
    if (binderId && !(await client.binder.findFirst({ where: { id: binderId, userId: user.id } }))) throw new ValidationError("Unknown binder.");
    const count = await client.collectionItem.count({ where: { userId: user.id } });
    if (count >= 5000) throw new ValidationError("Collection limit reached.");
    const { card } = await getCatalog().getCard(catalogId);
    const item = await client.collectionItem.create({
      data: {
        userId: user.id,
        catalogId,
        setId: card.setId,
        name: card.name,
        setName: card.setName,
        number: card.number,
        finish: s.finish,
        language: s.lang,
        grading: s.grading,
        condition: s.condition ?? null,
        grader: s.grader ?? null,
        grade: s.grade ?? null,
        quantity,
        purchasePriceMinor: purchasePrice && purchaseCurrency ? parseMinor(purchasePrice, purchaseCurrency) : null,
        purchaseCurrency: purchaseCurrency ?? null,
        binderId: binderId ?? null,
      },
    });
    return Response.json({ ok: true, id: item.id });
  } catch (err) {
    return errorResponse(err, "collection.add");
  }
}
