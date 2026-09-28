import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { catalog } from "@/lib/catalog";
import { ConfirmSchema } from "@/lib/schemas";
import { handleRouteError, jsonError } from "@/lib/server/api";
import { confirmScan } from "@/lib/server/repo";

export const runtime = "nodejs";

const ScanId = z.string().regex(/^[a-z0-9]{10,40}$/);

/** Records which card the buyer confirmed for a scan (only after explicit confirmation). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ScanId.safeParse(id).success) return jsonError(400, "bad_id", "Invalid scan id.");
  const body = ConfirmSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "bad_request", "Missing card id.");
  try {
    const card = await catalog().getCard(body.data.catalogId);
    if (!card) return jsonError(404, "not_found", "Card not found.");
    const saved = await confirmScan(id, card);
    return NextResponse.json({ saved });
  } catch (err) {
    return handleRouteError("confirm", err);
  }
}
