import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { finishLabel } from "@/lib/catalog/types";
import { formatMinor } from "@/lib/money";
import { SOURCES, type SourceId } from "@/lib/prices";
import { CONDITIONS, LANGUAGES } from "@/lib/selection";
import { loadShare } from "@/lib/share";

// Shared pages are private-by-link: keep them out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

const KIND_LABEL = { collection: "Collection", binder: "Binder", wishlist: "Wishlist" } as const;

export default async function SharedPage({ params }: PageProps<"/u/[slug]">) {
  const { slug } = await params;
  const share = await loadShare(slug);
  if (!share) notFound();
  const count = share.cards.reduce((n, c) => n + c.quantity, 0);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-medium text-slate-600">Shared {KIND_LABEL[share.kind].toLowerCase()} · read-only</p>
        <h1 className="text-2xl font-bold">{share.title}</h1>
        <p className="text-slate-700">
          {count} card{count === 1 ? "" : "s"}
          {share.kind === "wishlist" ? " wanted" : ""}.
          {share.showValues && " Values are reference prices per source, not offers."}
        </p>
      </div>
      {share.totals && share.totals.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {share.totals.map((t) => (
            <div key={t.source} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-600">{SOURCES[t.source as SourceId].label} basis</p>
              <p className="font-mono text-xl font-semibold">{formatMinor(t.amountMinor, t.currency)}</p>
            </div>
          ))}
        </div>
      )}
      {share.cards.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4">Nothing here yet.</p>
      ) : (
        <ul className="grid gap-2">
          {share.cards.map((c, i) => (
            <li key={`${c.catalogId}-${i}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold">
                {c.quantity > 1 && <span className="text-slate-600">{c.quantity}× </span>}
                {c.name}
              </p>
              <p className="text-sm text-slate-700">
                {c.setName} #{c.number} · {finishLabel(c.finish)}
                {share.kind !== "wishlist" && (
                  <>
                    {" "}· {LANGUAGES[c.language as keyof typeof LANGUAGES] ?? c.language} ·{" "}
                    {c.grading === "graded" ? `${c.grader} ${c.grade}` : (CONDITIONS[c.condition as keyof typeof CONDITIONS] ?? c.condition)}
                  </>
                )}
              </p>
              {c.values && c.values.length > 0 && (
                <p className="text-sm">
                  {c.values.map((v) => (
                    <span key={v.source} className="mr-3 inline-block">
                      {SOURCES[v.source as SourceId]?.label}: <span className="font-mono">{formatMinor(v.unitMinor, v.currency)}</span>
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-slate-700">
        Made with <Link href="/" className="font-medium text-brand-700 underline">Card Compass</Link>.
      </p>
    </div>
  );
}
