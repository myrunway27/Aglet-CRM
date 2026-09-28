import { errorResponse } from "@/lib/api";
import { sendVerification } from "@/lib/auth/email-tokens";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { KeyedLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
const limiter = new KeyedLimiter(3);

/** Re-send the verification email to the signed-in user. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    limiter.check(user.id);
    const full = await db()!.user.findUnique({ where: { id: user.id } });
    if (full?.emailVerifiedAt) throw new ValidationError("Your email is already confirmed.");
    await sendVerification(user.id, user.email);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "auth.verify.send");
  }
}
