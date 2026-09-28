import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const Query = z.object({ q: z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Query is too long.") });

export async function GET(req: Request) {
  try {
    const parsed = Query.safeParse({ q: new URL(req.url).searchParams.get("q") ?? "" });
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query.");
    const catalog = getCatalog();
    const results = (await catalog.searchText(parsed.data.q)).slice(0, 20);
    return Response.json({ mode: catalog.id === "mock" ? "mock" : "live", results });
  } catch (err) {
    return errorResponse(err, "search");
  }
}
