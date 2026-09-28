import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const BinderName = z.string().trim().min(1, "Name the binder.").max(60, "Keep names under 60 characters.");

export async function GET() {
  try {
    const user = await requireUser();
    const binders = await requireDb().binder.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });
    return Response.json({ binders: binders.map((b) => ({ id: b.id, name: b.name, itemCount: b._count.items })) });
  } catch (err) {
    return errorResponse(err, "binders.get");
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = z.object({ name: BinderName }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid name.");
    const client = requireDb();
    if ((await client.binder.count({ where: { userId: user.id } })) >= 100) throw new ValidationError("Binder limit reached (100).");
    if (await client.binder.findUnique({ where: { userId_name: { userId: user.id, name: body.data.name } } }))
      throw new ValidationError("You already have a binder with that name.");
    const b = await client.binder.create({ data: { userId: user.id, name: body.data.name } });
    return Response.json({ ok: true, id: b.id });
  } catch (err) {
    return errorResponse(err, "binders.create");
  }
}
