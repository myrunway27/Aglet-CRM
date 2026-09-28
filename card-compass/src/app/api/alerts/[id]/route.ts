import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const r = await requireDb().priceAlert.deleteMany({ where: { id, userId: user.id } });
    if (r.count === 0) throw new NotFoundError("Alert not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "alerts.delete");
  }
}
