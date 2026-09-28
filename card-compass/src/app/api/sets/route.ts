import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { mapLimit } from "@/lib/references";

export const runtime = "nodejs";

/** Completion for every set the user owns at least one card from. */
export async function GET() {
  try {
    const user = await requireUser();
    const items = await requireDb().collectionItem.findMany({
      where: { userId: user.id, setId: { not: "" } },
      select: { setId: true, setName: true, catalogId: true },
    });
    const bySet = new Map<string, { setName: string; owned: Set<string> }>();
    for (const i of items) {
      const s = bySet.get(i.setId) ?? { setName: i.setName, owned: new Set<string>() };
      s.owned.add(i.catalogId);
      bySet.set(i.setId, s);
    }
    const catalog = getCatalog();
    const sets = await mapLimit([...bySet.entries()], 3, async ([setId, s]) => {
      const cards = await catalog.listSet(setId).catch(() => null);
      const inSet = cards ? new Set(cards.map((c) => c.catalogId)) : null;
      return {
        setId,
        setName: s.setName,
        owned: inSet ? [...s.owned].filter((id) => inSet.has(id)).length : s.owned.size,
        total: cards?.length ?? null,
        printedTotal: cards?.[0]?.setPrintedTotal ?? null,
      };
    });
    sets.sort((a, b) => (b.total ? b.owned / b.total : 0) - (a.total ? a.owned / a.total : 0));
    return Response.json({ sets });
  } catch (err) {
    return errorResponse(err, "sets.get");
  }
}
