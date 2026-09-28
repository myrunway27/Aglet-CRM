import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { ValidationError } from "@/lib/errors";
import { confirmScan } from "@/lib/repo";

export const runtime = "nodejs";

const Body = z.object({ catalogId: z.string().regex(CATALOG_ID_RE) });

export async function POST(req: Request, ctx: RouteContext<"/api/scans/[id]/confirm">) {
  try {
    const { id } = await ctx.params;
    if (!/^[a-z0-9]{10,40}$/.test(id)) throw new ValidationError("Invalid scan id.");
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError("Invalid card id.");
    const { card } = await getCatalog().getCard(body.data.catalogId);
    const persisted = await confirmScan(id, card);
    return Response.json({ ok: true, persisted });
  } catch (err) {
    return errorResponse(err, "confirm");
  }
}
