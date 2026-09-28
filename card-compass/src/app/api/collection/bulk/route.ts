import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { insertItems } from "@/lib/collection-write";
import { ValidationError } from "@/lib/errors";
import { Selection } from "@/lib/selection";

export const runtime = "nodejs";

const Body = z.object({
  binderId: z.string().max(40).nullable().default(null),
  items: z
    .array(z.object({ catalogId: z.string().regex(CATALOG_ID_RE), selection: Selection, quantity: z.number().int().min(1).max(999) }))
    .min(1)
    .max(200),
});

/** Add several confirmed cards at once (from a bulk-scan session). */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Every card needs a confirmed printing, finish and condition.");
    const { binderId, items } = body.data;
    if (binderId && !(await client.binder.findFirst({ where: { id: binderId, userId: user.id } }))) throw new ValidationError("Unknown binder.");
    if ((await client.collectionItem.count({ where: { userId: user.id } })) + items.length > 5000)
      throw new ValidationError("Collection limit reached.");
    const cards = new Map((await getCatalog().getCards(items.map((i) => i.catalogId))).map((c) => [c.catalogId, c]));
    const added = await insertItems(
      client,
      user.id,
      items.map((i) => ({ ...i, purchasePriceMinor: null, purchaseCurrency: null, binderId })),
      cards,
    );
    return Response.json({ ok: true, added, skipped: items.length - added });
  } catch (err) {
    return errorResponse(err, "collection.bulk");
  }
}
