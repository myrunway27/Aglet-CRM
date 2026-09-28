import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(20).max(4096).regex(/^[A-Za-z0-9:_\-.]+$/), platform: z.enum(["ios", "android"]) });

/** Register a native app device token for the signed-in user. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid device token.");
    const client = requireDb();
    if ((await client.nativePushToken.count({ where: { userId: user.id } })) >= 20) throw new ValidationError("Too many devices.");
    await client.nativePushToken.upsert({
      where: { token: body.data.token },
      create: { userId: user.id, token: body.data.token, platform: body.data.platform },
      update: { userId: user.id, platform: body.data.platform },
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "push.native.register");
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = z.object({ token: z.string().max(4096) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid request.");
    await requireDb().nativePushToken.deleteMany({ where: { userId: user.id, token: body.data.token } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "push.native.unregister");
  }
}
