import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: RouteContext<"/api/collection/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = z
      .object({ quantity: z.number().int().min(1).max(999).optional(), binderId: z.string().max(40).nullable().optional() })
      .refine((b) => b.quantity !== undefined || b.binderId !== undefined)
      .safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Quantity must be 1–999.");
    const client = requireDb();
    if (body.data.binderId && !(await client.binder.findFirst({ where: { id: body.data.binderId, userId: user.id } })))
      throw new ValidationError("Unknown binder.");
    const r = await client.collectionItem.updateMany({ where: { id, userId: user.id }, data: body.data });
    if (r.count === 0) throw new NotFoundError("Item not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "collection.update");
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/collection/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const r = await requireDb().collectionItem.deleteMany({ where: { id, userId: user.id } });
    if (r.count === 0) throw new NotFoundError("Item not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "collection.delete");
  }
}
