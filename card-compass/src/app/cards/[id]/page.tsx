import { notFound } from "next/navigation";
import { PriceResults } from "@/components/PriceResults";
import { currentUser } from "@/lib/auth/session";
import { getCatalog } from "@/lib/catalog";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { env } from "@/lib/env";
import { resolveSelection } from "@/lib/selection";

export default async function CardPage({ params, searchParams }: PageProps<"/cards/[id]">) {
  const { id } = await params;
  if (!CATALOG_ID_RE.test(id)) notFound();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // The card's finishes pick a sensible default finish; a catalog outage just means "normal".
  const finishes = await getCatalog()
    .getCard(id)
    .then((d) => d.card.finishes)
    .catch(() => [] as string[]);
  const { selection, assumed } = resolveSelection(
    {
      finish: one(sp.finish),
      lang: one(sp.lang),
      grading: one(sp.grading),
      condition: one(sp.condition),
      grader: one(sp.grader),
      grade: one(sp.grade),
    },
    finishes,
  );
  const user = await currentUser();
  return (
    <PriceResults
      cardId={id}
      selection={selection}
      assumed={assumed}
      signedIn={Boolean(user)}
      offersEnabled={env().OFFERS_PROVIDER !== "none"}
    />
  );
}
