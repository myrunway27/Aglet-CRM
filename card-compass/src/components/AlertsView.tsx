"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { formatMinor } from "@/lib/money";
import { SOURCES, subtypeLabel, type SourceId } from "@/lib/prices";
import { PushToggle } from "./PushToggle";

interface Alert {
  id: string;
  catalogId: string;
  cardName: string;
  finish: string;
  source: SourceId;
  subtype: string;
  currency: string;
  direction: "above" | "below";
  thresholdMinor: number;
  lastValueMinor: number | null;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
}
interface Note {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  readAt: string | null;
}
interface Data {
  alerts: Alert[];
  notifications: Note[];
  push: { enabled: boolean; devices: number; native: { ios: boolean; android: boolean } };
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";

export function AlertsView() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>("/api/alerts"));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  const unread = data?.notifications.filter((n) => !n.readAt).length ?? 0;
  useEffect(() => {
    if (unread > 0) {
      const t = setTimeout(() => {
        void api("/api/notifications/read", "POST", {}).then(() => router.refresh());
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [unread, router]);

  if (error) return <p role="alert" className="text-bad">{error}</p>;
  if (!data) return <p aria-busy="true">Loading alerts…</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Price alerts</h1>
        <p className="text-ink-2">
          Alerts watch a reference price (e.g. TCGplayer market) and notify you once when it crosses your threshold. Create
          one from any card&apos;s price page.
        </p>
      </div>

      <section aria-labelledby="push-h" className="grid gap-2 rounded-xl border border-line bg-surface p-4">
        <h2 id="push-h" className="font-semibold">Notifications on this device</h2>
        <PushToggle serverEnabled={data.push.enabled} nativeEnabled={data.push.native} />
      </section>

      <section aria-labelledby="alerts-h" className="grid gap-2">
        <h2 id="alerts-h" className="text-xl font-semibold">Your alerts ({data.alerts.length})</h2>
        {data.alerts.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-3">
            No alerts yet. <Link href="/" className="font-medium text-link underline">Find a card</Link> to create one.
          </p>
        ) : (
          <ul className="grid gap-2">
            {data.alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-line bg-surface p-3">
                <div>
                  <p className="font-semibold">{a.cardName}</p>
                  <p className="text-sm text-ink-2">
                    {SOURCES[a.source].label} {subtypeLabel(a.subtype).toLowerCase()} ({finishLabel(a.finish)}) goes {a.direction}{" "}
                    <span className="font-mono">{formatMinor(a.thresholdMinor, a.currency)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {a.lastValueMinor !== null ? `Last seen ${formatMinor(a.lastValueMinor, a.currency)}` : "Not checked yet"}
                    {a.lastCheckedAt ? ` · checked ${when(a.lastCheckedAt)}` : ""}
                    {a.lastTriggeredAt ? ` · last fired ${when(a.lastTriggeredAt)}` : ""}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await api(`/api/alerts/${a.id}`, "DELETE");
                    void load();
                  }}
                  className="rounded border border-line-strong px-2 py-1 text-sm"
                >
                  Delete<span className="sr-only"> alert for {a.cardName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes-h" className="grid gap-2">
        <h2 id="notes-h" className="text-xl font-semibold">Recent notifications</h2>
        {data.notifications.length === 0 ? (
          <p className="text-ink-2">None yet.</p>
        ) : (
          <ul className="grid gap-2">
            {data.notifications.map((n) => (
              <li key={n.id} className={`rounded-lg border p-3 ${n.readAt ? "border-line bg-surface" : "border-ink bg-primary-soft"}`}>
                <Link href={n.url} className="font-semibold underline decoration-line-strong">{n.title}</Link>
                <p className="text-sm text-ink-2">{n.body}</p>
                <p className="text-xs text-muted">{when(n.createdAt)}{!n.readAt && " · new"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
