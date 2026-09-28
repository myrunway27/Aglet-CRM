import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { requireUser } from "@/lib/auth/guard";
import { COLLECTION_COLUMNS, toCsv } from "@/lib/csv";
import { minorExponent } from "@/lib/money";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await requireDb().collectionItem.findMany({
      where: { userId: user.id },
      include: { binder: true },
      orderBy: [{ setName: "asc" }, { number: "asc" }],
    });
    const csv = toCsv([
      [...COLLECTION_COLUMNS],
      ...items.map((i) => [
        i.catalogId,
        i.name,
        i.setName,
        i.number,
        i.finish,
        i.language,
        i.grading,
        i.condition,
        i.grader,
        i.grade,
        i.quantity,
        i.purchasePriceMinor !== null && i.purchaseCurrency
          ? (i.purchasePriceMinor / 10 ** minorExponent(i.purchaseCurrency)).toFixed(minorExponent(i.purchaseCurrency))
          : null,
        i.purchaseCurrency,
        i.binder?.name ?? null,
        i.certNumber,
      ]),
    ]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="card-compass-collection-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err, "collection.export");
  }
}
