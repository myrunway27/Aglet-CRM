import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { CatalogCard } from "./catalog/types";
import type { Selection } from "./selection";

export interface NewItem {
  catalogId: string;
  selection: Selection;
  quantity: number;
  purchasePriceMinor: number | null;
  purchaseCurrency: string | null;
  binderId: string | null;
}

/** Insert many collection items for cards already resolved against the catalog. */
export async function insertItems(client: PrismaClient, userId: string, items: NewItem[], cards: Map<string, CatalogCard>) {
  const data = items.flatMap((it) => {
    const c = cards.get(it.catalogId);
    if (!c) return [];
    const s = it.selection;
    return [
      {
        userId,
        catalogId: it.catalogId,
        setId: c.setId,
        name: c.name,
        setName: c.setName,
        number: c.number,
        finish: s.finish,
        language: s.lang,
        grading: s.grading,
        condition: s.condition ?? null,
        grader: s.grader ?? null,
        grade: s.grade ?? null,
        quantity: it.quantity,
        purchasePriceMinor: it.purchasePriceMinor,
        purchaseCurrency: it.purchaseCurrency,
        binderId: it.binderId,
      },
    ];
  });
  if (data.length) await client.collectionItem.createMany({ data });
  return data.length;
}
