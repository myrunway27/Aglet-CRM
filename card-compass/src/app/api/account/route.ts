import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { ValidationError } from "@/lib/errors";
import { REGION_CODES } from "@/lib/regions";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = z.object({ country: z.enum(REGION_CODES) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Unsupported country.");
    await requireDb().user.update({ where: { id: user.id }, data: { country: body.data.country } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "account.update");
  }
}

/** Delete the account and everything linked to it. */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    await requireDb().user.delete({ where: { id: user.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "account.delete");
  }
}
