"use client";

import { useActionState } from "react";
import { sendInvites, type InviteState } from "@/actions/invites";

export function InviteForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvites, undefined);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="businessId" value={businessId} />
      <textarea
        name="emails"
        rows={3}
        required
        placeholder={"customer1@example.com\ncustomer2@example.com\n…"}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <p className="text-xs text-stone-500">
        Every address gets the same neutral invitation, once ever. Inviting only customers you
        expect to be positive (&ldquo;review gating&rdquo;) is illegal under US federal rules — so
        the form simply doesn&apos;t allow targeting. Up to 50 per batch, 100 per month.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.sent !== undefined && (
        <p className="text-sm text-brand-700">
          ✓ {state.sent} invitation{state.sent !== 1 ? "s" : ""} sent
          {state.skipped ? ` · ${state.skipped} skipped (already invited)` : ""}.
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Sending…" : "Send invitations"}
      </button>
    </form>
  );
}
