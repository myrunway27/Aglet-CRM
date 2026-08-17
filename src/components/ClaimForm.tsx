"use client";

import { useState, useActionState } from "react";
import {
  submitClaim,
  startEmailClaim,
  confirmEmailClaim,
  type FormState,
  type ClaimEmailState,
} from "@/actions/owner";

export function ClaimForm({
  businessId,
  businessName,
  domainHint,
}: {
  businessId: string;
  businessName: string;
  domainHint: string | null;
}) {
  const [manualMode, setManualMode] = useState(false);
  const [sendState, sendAction, sending] = useActionState<ClaimEmailState, FormData>(
    startEmailClaim,
    undefined
  );
  const [confirmState, confirmAction, confirming] = useActionState<ClaimEmailState, FormData>(
    confirmEmailClaim,
    undefined
  );
  const [manualState, manualAction, manualPending] = useActionState<FormState, FormData>(
    submitClaim,
    undefined
  );

  if (confirmState?.approved) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
        <p className="font-medium text-brand-800">✓ You are now the verified owner.</p>
        <p className="mt-1 text-stone-600">
          Your verified-owner badge is live. Reply to reviews from the &ldquo;My businesses&rdquo;
          page.
        </p>
      </div>
    );
  }

  if (manualState?.ok) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
        <p className="font-medium text-brand-800">✓ Claim submitted.</p>
        <p className="mt-1 text-stone-600">
          An administrator will verify your evidence. Once approved, you&apos;ll get a
          verified-owner badge and can reply to reviews from the &ldquo;My businesses&rdquo; page.
        </p>
      </div>
    );
  }

  // Step 2 of the instant path: the code was emailed, ask for it.
  if (sendState?.codeSent || confirmState?.codeSent) {
    return (
      <form action={confirmAction} className="space-y-3">
        <input type="hidden" name="businessId" value={businessId} />
        <p className="text-sm text-stone-600">
          We emailed a 6-digit code to the business address you gave. Enter it here to become the
          verified owner instantly.
        </p>
        <label className="block">
          <span className="text-sm font-medium">Verification code</span>
          <input
            name="code"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        {confirmState?.error && <p className="text-sm text-red-600">{confirmState.error}</p>}
        <button
          disabled={confirming}
          className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {confirming ? "Checking…" : "Confirm ownership"}
        </button>
      </form>
    );
  }

  if (manualMode) {
    return (
      <form action={manualAction} className="space-y-3">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="block">
          <span className="text-sm font-medium">How can we verify you own this business?</span>
          <textarea
            name="evidence"
            rows={4}
            required
            minLength={20}
            maxLength={2000}
            placeholder="e.g. a business email address we can contact, your business phone number, a link to your website or registration…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        <p className="text-xs text-stone-500">
          This evidence is only visible to administrators — never published. An administrator
          reviews manual claims, so this path takes longer.
        </p>
        {manualState?.error && <p className="text-sm text-red-600">{manualState.error}</p>}
        <div className="flex items-center gap-3">
          <button
            disabled={manualPending}
            className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
          >
            {manualPending ? "Submitting…" : "Submit for review"}
          </button>
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-sm text-brand-700 hover:underline cursor-pointer"
          >
            ← Back to instant verification
          </button>
        </div>
      </form>
    );
  }

  // Step 1 of the instant path (the default): ask for a business-domain email.
  return (
    <div className="space-y-4">
      <form action={sendAction} className="space-y-3">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="block">
          <span className="text-sm font-medium">Your email at the business</span>
          <input
            name="claimEmail"
            type="email"
            required
            placeholder={domainHint ? `you@${domainHint}` : "you@yourbusiness.com"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        <p className="text-xs text-stone-500">
          If the email&apos;s domain matches {businessName}, we send a code there and you&apos;re
          verified the moment you enter it — no waiting.
        </p>
        {sendState?.mismatch && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            That email&apos;s domain doesn&apos;t match the business name, so we can&apos;t verify
            it automatically. Use the manual review below instead.
          </p>
        )}
        {sendState?.error && <p className="text-sm text-red-600">{sendState.error}</p>}
        <button
          disabled={sending}
          className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {sending ? "Sending code…" : "Send verification code"}
        </button>
      </form>
      <div className="border-t border-stone-200 pt-3">
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-sm text-brand-700 hover:underline cursor-pointer"
        >
          No email at the business&apos;s own domain? Submit evidence for manual review →
        </button>
      </div>
    </div>
  );
}
