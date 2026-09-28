import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceResults } from "@/components/PriceResults";
import { currentUser } from "@/lib/auth/session";
import { CATALOG_ID_RE } from "@/lib/catalog/types";
import { env } from "@/lib/env";
import { Selection } from "@/lib/selection";

export default async function CardPage({ params, searchParams }: PageProps<"/cards/[id]">) {
  const { id } = await params;
  if (!CATALOG_ID_RE.test(id)) notFound();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const selection = Selection.safeParse({
    finish: one(sp.finish),
    lang: one(sp.lang),
    grading: one(sp.grading),
    condition: one(sp.condition),
    grader: one(sp.grader),
    grade: one(sp.grade),
  });

  if (!selection.success) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-bold">Confirm your card first</h1>
        <p className="text-slate-700">
          We need the exact finish, language and condition before showing references, so prices for a
          different printing aren&apos;t mistaken for yours.
        </p>
        <Link href="/" className="justify-self-start rounded-md bg-brand-700 px-4 py-2 font-semibold text-white">
          Start over
        </Link>
      </div>
    );
  }
  const user = await currentUser();
  return (
    <PriceResults
      cardId={id}
      selection={selection.data}
      signedIn={Boolean(user)}
      offersEnabled={env().OFFERS_PROVIDER !== "none"}
    />
  );
}
