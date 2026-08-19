"use client";

import { useState } from "react";

export function BadgeSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<a href="${origin}/business/${slug}"><img src="${origin}/api/badge/${slug}" alt="Our rating on True Review" width="240" height="76"></a>`;

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/badge/${slug}`} alt="Rating badge preview" width={240} height={76} />
      <p className="text-xs text-stone-500">
        Paste this into your website — it always shows your live rating and links to your reviews:
      </p>
      <div className="flex gap-2">
        <code className="flex-1 text-[11px] bg-stone-100 border border-stone-200 rounded-lg p-2 overflow-x-auto whitespace-nowrap">
          {snippet}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(snippet).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="shrink-0 text-xs rounded-lg border border-stone-300 px-3 hover:border-brand-600 cursor-pointer"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
