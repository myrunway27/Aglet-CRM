import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { SET_ID_RE } from "@/lib/catalog/types";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/sets/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    if (!SET_ID_RE.test(id)) throw new NotFoundError("Unknown set");
    const cards = await getCatalog().listSet(id);
    if (cards.length === 0) throw new NotFoundError("Unknown set");
    const client = requireDb();
    const [owned, wanted] = await Promise.all([
      client.collectionItem.findMany({ where: { userId: user.id, setId: id }, select: { catalogId: true, finish: true, quantity: true } }),
      client.wishlistItem.findMany({ where: { userId: user.id, setId: id }, select: { catalogId: true, finish: true } }),
    ]);
    return Response.json({
      setId: id,
      setName: cards[0].setName,
      printedTotal: cards[0].setPrintedTotal,
      cards: cards.map((c) => ({
        card: c,
        ownedFinishes: owned.filter((o) => o.catalogId === c.catalogId).map((o) => o.finish),
        ownedCount: owned.filter((o) => o.catalogId === c.catalogId).reduce((n, o) => n + o.quantity, 0),
        wishlisted: wanted.some((w) => w.catalogId === c.catalogId),
      })),
    });
  } catch (err) {
    return errorResponse(err, "sets.detail");
  }
}
