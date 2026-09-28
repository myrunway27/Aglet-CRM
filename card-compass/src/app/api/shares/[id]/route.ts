import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

/** Revoke a share link (it stops working immediately). */
export async function DELETE(req: Request, ctx: RouteContext<"/api/shares/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const r = await requireDb().shareLink.updateMany({ where: { id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (r.count === 0) throw new NotFoundError("Share link not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "shares.revoke");
  }
}
