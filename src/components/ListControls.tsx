"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteList } from "@/actions/saves";

export function ListControls({
  listId,
  slug,
  isPublic,
}: {
  listId: string;
  slug: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/list/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      <button
        onClick={share}
        className="text-xs rounded-lg border border-stone-300 px-3 py-1.5 hover:border-brand-600 cursor-pointer"
      >
        {copied ? "✓ Link copied" : "🔗 Copy share link"}
      </button>
      {!isPublic && (
        <span className="text-xs text-stone-500 self-center">
          Private — only people you send the link to can open it.
        </span>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this list? The places themselves aren't affected.")) return;
          start(() => deleteList(listId).then(() => router.push("/lists")));
        }}
        className="text-xs text-stone-500 hover:text-red-600 underline cursor-pointer ml-auto"
      >
        Delete list
      </button>
    </div>
  );
}
