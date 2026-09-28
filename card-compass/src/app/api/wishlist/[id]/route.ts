import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

/** Remove a wishlist item and the price alert it created. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const client = requireDb();
    const item = await client.wishlistItem.findFirst({ where: { id, userId: user.id } });
    if (!item) throw new NotFoundError("Wishlist item not found");
    await client.$transaction([
      ...(item.alertId ? [client.priceAlert.deleteMany({ where: { id: item.alertId, userId: user.id } })] : []),
      client.wishlistItem.delete({ where: { id } }),
    ]);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "wishlist.delete");
  }
}
