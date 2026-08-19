"use client";

import { useActionState } from "react";
import { openBillingPortal, type BillingState } from "@/actions/billing";

export function ManageBilling() {
  const [state, formAction, pending] = useActionState<BillingState, FormData>(
    openBillingPortal,
    undefined
  );

  return (
    <form action={formAction} className="mt-2">
      <button
        disabled={pending}
        className="text-xs text-brand-700 font-medium hover:underline disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Opening…" : "Manage billing — change card, switch plan, or cancel"}
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
