import { z } from "zod";
import { clientKey, errorResponse } from "@/lib/api";
import { sendPasswordReset } from "@/lib/auth/email-tokens";
import { assertSameOrigin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { KeyedLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
let byIp: KeyedLimiter | undefined;
let byEmail: KeyedLimiter | undefined;

/** Always answers the same way, whether or not the email has an account. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    byIp ??= new KeyedLimiter(env().AUTH_LIMIT_PER_MINUTE);
    byEmail ??= new KeyedLimiter(2);
    byIp.check(clientKey(req));
    const body = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Enter a valid email.");
    const client = db();
    if (!client) throw new ValidationError("Accounts are unavailable: no database configured.");
    byEmail.check(body.data.email);
    const user = await client.user.findUnique({ where: { email: body.data.email } });
    if (user) await sendPasswordReset(user.id, user.email);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "auth.forgot");
  }
}
