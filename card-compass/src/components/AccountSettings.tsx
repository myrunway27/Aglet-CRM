"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { REGIONS } from "@/lib/regions";
import { useRegion } from "./PreferenceSelector";

export function AccountSettings({
  email,
  country,
  verified,
  emailAlerts,
  mailEnabled,
}: {
  email: string;
  country: string;
  verified: boolean;
  emailAlerts: boolean;
  mailEnabled: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(country);
  const [, setRegion] = useRegion();
  const [msg, setMsg] = useState<string | null>(null);
  const [alertsOn, setAlertsOn] = useState(emailAlerts);

  return (
    <div className="grid max-w-lg gap-5">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-ink-2">
        Signed in as {email}{" "}
        {verified ? (
          <span className="rounded bg-good-soft px-1.5 py-0.5 text-xs font-medium text-good">Email confirmed</span>
        ) : (
          <span className="rounded bg-warn-soft px-1.5 py-0.5 text-xs font-medium text-warn">Email not confirmed</span>
        )}
      </p>
      {!verified && mailEnabled && (
        <button
          className="justify-self-start rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
          onClick={async () => {
            try {
              await api("/api/auth/verify", "POST", {});
              setMsg("Confirmation email sent. Check your inbox.");
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Couldn't send.");
            }
          }}
        >
          Send confirmation email
        </button>
      )}
      {mailEnabled && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-ink"
            checked={alertsOn}
            disabled={!verified}
            onChange={async (e) => {
              const on = e.target.checked;
              setAlertsOn(on); // optimistic; reverted if saving fails
              try {
                await api("/api/account", "PATCH", { emailAlerts: on });
                setMsg(on ? "Price alerts will also be emailed to you." : "Email alerts are off.");
              } catch (err) {
                setAlertsOn(!on);
                setMsg(err instanceof Error ? err.message : "Couldn't save.");
              }
            }}
          />
          <span>
            Email me when a price alert fires{!verified && " (confirm your email first)"}
          </span>
        </label>
      )}
      <label className="grid gap-1 text-sm font-medium">
        Country (sets currency and delivered-cost destination)
        <select
          value={value}
          onChange={async (e) => {
            setValue(e.target.value);
            await api("/api/account", "PATCH", { country: e.target.value });
            setRegion(e.target.value as keyof typeof REGIONS);
            setMsg("Saved.");
          }}
          className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-base"
        >
          {Object.entries(REGIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label} ({v.currency})
            </option>
          ))}
        </select>
      </label>
      {msg && <p role="status" className="text-sm text-good">{msg}</p>}
      <section className="grid gap-2 rounded-xl border border-bad-line bg-bad-soft p-4">
        <h2 className="font-semibold text-bad">Delete account</h2>
        <p className="text-sm text-bad">Permanently deletes your account, collection, value history, alerts and push subscriptions.</p>
        <button
          className="justify-self-start rounded-lg bg-bad-solid px-3 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            if (!confirm("Delete your account and all its data? This cannot be undone.")) return;
            await api("/api/account", "DELETE");
            router.push("/");
            router.refresh();
          }}
        >
          Delete my account
        </button>
      </section>
    </div>
  );
}
