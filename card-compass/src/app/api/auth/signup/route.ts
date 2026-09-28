import { clientKey, errorResponse } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { Signup } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { KeyedLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
const limiter = new KeyedLimiter(5);

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    limiter.check(clientKey(req));
    const client = db();
    if (!client) throw new ValidationError("Accounts are unavailable: no database configured.");
    const body = Signup.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid details.");
    const existing = await client.user.findUnique({ where: { email: body.data.email } });
    if (existing) throw new ValidationError("That email already has an account. Sign in instead.");
    const user = await client.user.create({
      data: { email: body.data.email, passwordHash: await hashPassword(body.data.password), country: body.data.country },
    });
    await createSession(user.id, req);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "signup");
  }
}
