"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";

interface Link {
  id: string;
  kind: "collection" | "binder" | "wishlist";
  title: string;
  binderId: string | null;
  showValues: boolean;
  viewCount: number;
  url: string;
}

export function SharePanel({ binders, defaultBinder }: { binders: Array<{ id: string; name: string }>; defaultBinder?: string }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [target, setTarget] = useState(defaultBinder && defaultBinder !== "all" && defaultBinder !== "none" ? `binder:${defaultBinder}` : "collection");
  const [title, setTitle] = useState("");
  const [showValues, setShowValues] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLinks((await api<{ links: Link[] }>("/api/shares")).links);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load().catch(() => undefined);
  }, [load]);

  const targetLabel = target === "collection" ? "My collection" : target === "wishlist" ? "My wishlist" : (binders.find((b) => `binder:${b.id}` === target)?.name ?? "Binder");

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const [kind, binderId] = target.split(":");
      await api("/api/shares", "POST", { kind, binderId, title: title.trim() || targetLabel, showValues });
      setTitle("");
      setMsg({ ok: true, text: "Link created. Anyone with it can view (read-only)." });
      void load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ClientApiError ? err.message : "Network error." });
    }
  }

  const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-base";
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Share a read-only link</h3>
      <p className="text-sm text-slate-700">
        Great for trade lists: share a binder. Viewers see cards, condition/grade and quantities. They never see your email,
        purchase prices or cert numbers. Links aren&apos;t indexed by search engines and you can revoke them any time.
      </p>
      <form onSubmit={create} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="text-sm font-medium">
          What
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
            <option value="collection">Whole collection</option>
            {binders.map((b) => <option key={b.id} value={`binder:${b.id}`}>Binder: {b.name}</option>)}
            <option value="wishlist">Wishlist</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={targetLabel} maxLength={80} className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} className="h-4 w-4 accent-brand-700" />
          Show values
        </label>
        <button className="rounded-md bg-brand-700 px-3 py-2 font-semibold text-white">Create link</button>
      </form>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
      {links.length > 0 && (
        <ul className="grid gap-2" aria-label="Your share links">
          {links.map((l) => (
            <li key={l.id} className="grid gap-1 rounded-md border border-slate-200 p-2 text-sm">
              <span className="font-medium">
                {l.title} <span className="font-normal text-slate-600">· {l.kind}{l.showValues ? " · with values" : ""} · {l.viewCount} view{l.viewCount === 1 ? "" : "s"}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <input readOnly value={l.url} aria-label={`Link for ${l.title}`} className="min-w-0 flex-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(l.url);
                      setMsg({ ok: true, text: "Copied." });
                    } catch {
                      setMsg({ ok: false, text: "Couldn't copy; select the link and copy it." });
                    }
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-2 py-1 text-red-800"
                  onClick={async () => {
                    await api(`/api/shares/${l.id}`, "DELETE");
                    void load();
                  }}
                >
                  Revoke<span className="sr-only"> {l.title}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
