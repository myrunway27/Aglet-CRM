"use client";

import { useActionState, useState } from "react";
import { startCheckout, type BillingState } from "@/actions/billing";

export type PlanCard = {
  id: string;
  name: string;
  monthly: string;
  annual: string;
  annualSaving: string;
  features: string[];
};

export function PlanPicker({
  plans,
  enabled,
}: {
  plans: PlanCard[];
  enabled: boolean;
}) {
  const [interval, setInterval] = useState<"annual" | "monthly">("annual");
  const [state, formAction, pending] = useActionState<BillingState, FormData>(
    startCheckout,
    undefined
  );

  return (
    <div>
      <div className="mt-2 inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-xs">
        {(["annual", "monthly"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setInterval(v)}
            className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
              interval === v ? "bg-brand-700 text-white" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {v === "annual" ? "Annual — 2 months free" : "Monthly"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {plans.map((t) => (
          <div key={t.id} className="rounded-lg border border-stone-200 bg-stone-50/60 p-3 flex flex-col">
            <p className="font-semibold">
              {t.name}{" "}
              <span className="text-brand-700">
                {interval === "annual" ? `${t.annual}/yr` : `${t.monthly}/mo`}
              </span>
            </p>
            {interval === "annual" && (
              <p className="text-xs text-brand-700">Save {t.annualSaving} a year</p>
            )}
            <ul className="mt-1 space-y-0.5 text-xs text-stone-600 flex-1">
              {t.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {enabled && (
              <form action={formAction} className="mt-2">
                <input type="hidden" name="tier" value={t.id} />
                <input type="hidden" name="interval" value={interval} />
                <button
                  disabled={pending}
                  className="w-full rounded-lg bg-brand-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
                >
                  {pending ? "Starting…" : `Choose ${t.name}`}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}

      {!enabled && (
        <p className="mt-2 text-stone-600 text-sm">
          To join, email{" "}
          <a href="mailto:hello@truereview.me" className="text-brand-700 underline">
            hello@truereview.me
          </a>{" "}
          — online payment is coming.
        </p>
      )}
    </div>
  );
}
