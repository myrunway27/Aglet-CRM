import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    await requireDb().notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "notifications.read");
  }
}
