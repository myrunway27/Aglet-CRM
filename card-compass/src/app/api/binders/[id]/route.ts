import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: RouteContext<"/api/binders/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Name must be 1–60 characters.");
    const client = requireDb();
    const clash = await client.binder.findUnique({ where: { userId_name: { userId: user.id, name: body.data.name } } });
    if (clash && clash.id !== id) throw new ValidationError("You already have a binder with that name.");
    const r = await client.binder.updateMany({ where: { id, userId: user.id }, data: { name: body.data.name } });
    if (r.count === 0) throw new NotFoundError("Binder not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "binders.rename");
  }
}

/** Deleting a binder keeps its cards (they move to "No binder"). */
export async function DELETE(req: Request, ctx: RouteContext<"/api/binders/[id]">) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await ctx.params;
    const r = await requireDb().binder.deleteMany({ where: { id, userId: user.id } });
    if (r.count === 0) throw new NotFoundError("Binder not found");
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "binders.delete");
  }
}
