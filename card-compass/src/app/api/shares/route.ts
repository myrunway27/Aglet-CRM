import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { newSlug, SHARE_KINDS } from "@/lib/share";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const links = await requireDb().shareLink.findMany({ where: { userId: user.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
    return Response.json({
      links: links.map((l) => ({ id: l.id, kind: l.kind, title: l.title, binderId: l.binderId, showValues: l.showValues, viewCount: l.viewCount, url: `${env().APP_URL}/u/${l.slug}` })),
    });
  } catch (err) {
    return errorResponse(err, "shares.get");
  }
}

const Create = z.object({
  kind: z.enum(SHARE_KINDS),
  binderId: z.string().max(40).optional(),
  title: z.string().trim().min(1).max(80),
  showValues: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = Create.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid share link.");
    const { kind, binderId, title, showValues } = body.data;
    if (kind === "binder" && !(binderId && (await client.binder.findFirst({ where: { id: binderId, userId: user.id } }))))
      throw new ValidationError("Choose one of your binders.");
    if ((await client.shareLink.count({ where: { userId: user.id, revokedAt: null } })) >= 20) throw new ValidationError("Share link limit reached (20).");
    const link = await client.shareLink.create({
      data: { userId: user.id, slug: newSlug(), kind, binderId: kind === "binder" ? binderId! : null, title, showValues },
    });
    return Response.json({ ok: true, url: `${env().APP_URL}/u/${link.slug}` });
  } catch (err) {
    return errorResponse(err, "shares.create");
  }
}
