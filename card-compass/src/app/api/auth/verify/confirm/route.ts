import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { consumeToken } from "@/lib/auth/email-tokens";
import { assertSameOrigin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

/** Confirm an email address. POST (not GET) so link scanners can't consume the token. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = z.object({ token: z.string().max(200) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid link.");
    const userId = await consumeToken(body.data.token, "verify");
    if (!userId) throw new ValidationError("This confirmation link is invalid or has expired. Send a new one from your Account page.");
    await db()!.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "auth.verify.confirm");
  }
}
