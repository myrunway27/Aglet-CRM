import { errorResponse } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/guard";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await destroySession();
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "logout");
  }
}
