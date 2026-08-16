"use client";

import { useActionState } from "react";
import { resendCode, verifyEmail, type FormState } from "@/actions/auth";

export function VerifyForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(verifyEmail, undefined);
  const [resendState, resendAction, resendPending] = useActionState<FormState, FormData>(
    resendCode,
    undefined
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-medium">6-digit code</span>
          <input
            name="code"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-brand-700 text-white py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Checking…" : "Verify email"}
        </button>
      </form>
      <form action={resendAction} className="text-center">
        {resendState && !resendState.error && (
          <p className="text-sm text-brand-800 mb-1">✓ New code sent.</p>
        )}
        {resendState?.error && <p className="text-sm text-red-600 mb-1">{resendState.error}</p>}
        <button
          disabled={resendPending}
          className="text-sm text-brand-700 hover:underline disabled:opacity-50 cursor-pointer"
        >
          Resend code
        </button>
      </form>
    </div>
  );
}
