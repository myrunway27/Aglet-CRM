import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const Sub = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Push endpoint must be https"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = Sub.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid push subscription.");
    const { endpoint, keys } = body.data;
    await requireDb().pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "push.subscribe");
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = z.object({ endpoint: z.string().max(1000) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid request.");
    await requireDb().pushSubscription.deleteMany({ where: { userId: user.id, endpoint: body.data.endpoint } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "push.unsubscribe");
  }
}
