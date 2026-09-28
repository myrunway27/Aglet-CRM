import { NextResponse, type NextRequest } from "next/server";
import { catalog } from "@/lib/catalog";
import { handleRouteError, jsonError, toSummary } from "@/lib/server/api";
import { SearchQuerySchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const parsed = SearchQuerySchema.safeParse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) return jsonError(400, "bad_query", parsed.error.issues[0]?.message ?? "Invalid search");
  try {
    const provider = catalog();
    const cards = await provider.search(parsed.data.q);
    return NextResponse.json({ provider: provider.id, results: cards.map(toSummary) });
  } catch (err) {
    return handleRouteError("search", err);
  }
}
