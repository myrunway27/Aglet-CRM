import type { ReactNode } from "react";
import { env } from "@/lib/env";

export function legalParties() {
  const e = env();
  return {
    operator: e.LEGAL_OPERATOR_NAME ?? "[operator name]",
    contact: e.LEGAL_CONTACT_EMAIL ?? "[contact email]",
    draft: !e.LEGAL_OPERATOR_NAME || !e.LEGAL_CONTACT_EMAIL,
  };
}

export function LegalPage({
  title,
  updated,
  draft,
  children,
}: {
  title: string;
  updated: string;
  draft: boolean;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto grid max-w-2xl gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1">
      {draft && (
        <p
          role="note"
          className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm"
        >
          <strong>Draft.</strong> This page has not been reviewed by a lawyer
          and the operator details are not filled in yet.
        </p>
      )}
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="text-sm text-muted">Last updated {updated}</p>
      {children}
    </article>
  );
}
