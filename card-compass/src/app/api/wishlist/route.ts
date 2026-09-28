import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { ValidationError } from "@/lib/errors";
import { parseMinor } from "@/lib/money";
import { SOURCES } from "@/lib/prices";
import { mapLimit, referencesFor } from "@/lib/references";
import { valueItem } from "@/lib/valuation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const client = requireDb();
    const [items, owned] = await Promise.all([
      client.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      client.collectionItem.findMany({ where: { userId: user.id }, select: { catalogId: true, finish: true } }),
    ]);
    const ownedKeys = new Set(owned.map((o) => `${o.catalogId}|${o.finish}`));
    const ids = [...new Set(items.map((i) => i.catalogId))];
    const refs = new Map(await mapLimit(ids, 4, async (id) => [id, (await referencesFor(id)).refs] as const));
    return Response.json({
      items: items.map((i) => ({
        ...i,
        owned: ownedKeys.has(`${i.catalogId}|${i.finish}`),
        valuation: valueItem({ finish: i.finish, language: "en", grading: "raw", quantity: 1 }, refs.get(i.catalogId) ?? []),
      })),
    });
  } catch (err) {
    return errorResponse(err, "wishlist.get");
  }
}

const Add = z.object({
  catalogId: z.string().regex(CATALOG_ID_RE),
  finish: z.string().regex(/^[A-Za-z0-9]{1,32}$/),
  target: z
    .object({
      price: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a target price like 12.50"),
      source: z.enum(["tcgplayer", "cardmarket"]),
    })
    .optional(),
});

/** Add a wanted card. A target price also creates a "below target" price alert. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = Add.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid wishlist item.");
    const { catalogId, finish, target } = body.data;
    if ((await client.wishlistItem.count({ where: { userId: user.id } })) >= 1000) throw new ValidationError("Wishlist limit reached.");
    if (await client.wishlistItem.findUnique({ where: { userId_catalogId_finish: { userId: user.id, catalogId, finish } } }))
      throw new ValidationError("Already on your wishlist.");
    const { card } = await getCatalog().getCard(catalogId);

    const created = await client.$transaction(async (tx) => {
      let alertId: string | null = null;
      let targetMinor: number | null = null;
      let targetCurrency: string | null = null;
      if (target) {
        targetCurrency = SOURCES[target.source].currency;
        targetMinor = parseMinor(target.price, targetCurrency);
        const alert = await tx.priceAlert.create({
          data: {
            userId: user.id,
            catalogId,
            cardName: `${card.name} (${card.setName} #${card.number})`,
            finish: target.source === "cardmarket" && finish !== "reverseHolofoil" ? "unspecified" : finish,
            source: target.source,
            subtype: target.source === "tcgplayer" ? "market" : "trend",
            currency: targetCurrency,
            direction: "below",
            thresholdMinor: targetMinor!,
          },
        });
        alertId = alert.id;
      }
      return tx.wishlistItem.create({
        data: {
          userId: user.id,
          catalogId,
          setId: card.setId,
          name: card.name,
          setName: card.setName,
          number: card.number,
          finish,
          targetMinor,
          targetCurrency,
          alertId,
        },
      });
    });
    return Response.json({ ok: true, id: created.id });
  } catch (err) {
    return errorResponse(err, "wishlist.add");
  }
}
