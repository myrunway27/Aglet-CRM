import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { consumeToken } from "@/lib/auth/email-tokens";
import { assertSameOrigin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().max(200), password: z.string().min(10, "Use at least 10 characters.").max(200) });

/** Set a new password with a reset token; signs out every other session. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid request.");
    const client = db();
    if (!client) throw new ValidationError("Accounts are unavailable.");
    const userId = await consumeToken(body.data.token, "reset");
    if (!userId) throw new ValidationError("This reset link is invalid or has expired. Request a new one.");
    await client.$transaction([
      client.user.update({
        where: { id: userId },
        // Receiving the reset email proves control of the address.
        data: { passwordHash: await hashPassword(body.data.password), emailVerifiedAt: new Date() },
      }),
      client.session.deleteMany({ where: { userId } }),
    ]);
    await createSession(userId, req);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "auth.reset");
  }
}
