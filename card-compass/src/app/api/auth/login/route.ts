import { clientKey, errorResponse } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { Credentials } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { KeyedLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
const byIp = new KeyedLimiter(10);
const byEmail = new KeyedLimiter(5);
let dummyHash: Promise<string> | undefined;

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    byIp.check(clientKey(req));
    const client = db();
    if (!client) throw new ValidationError("Accounts are unavailable: no database configured.");
    const body = Credentials.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Email or password is incorrect.");
    byEmail.check(body.data.email);
    const user = await client.user.findUnique({ where: { email: body.data.email } });
    // Hash even for unknown emails so timing doesn't reveal which accounts exist.
    dummyHash ??= hashPassword("not-a-real-password");
    const ok = await verifyPassword(body.data.password, user?.passwordHash ?? (await dummyHash));
    if (!user || !ok) throw new ValidationError("Email or password is incorrect.");
    await createSession(user.id, req);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "login");
  }
}
