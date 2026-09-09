"use client";

import { deleteAccount } from "@/actions/account";

// A confirm step in the browser is enough: the action is authenticated and
// irreversible, and nobody reaches this button by accident.
export function DeleteAccount() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (!confirm("Delete your account and every review you have posted? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
      className="mt-6 rounded-xl border border-line bg-white p-4"
    >
      <h2 className="font-semibold">Delete account</h2>
      <p className="text-sm text-stone-600 mt-1">
        Removes your login, your email address and every review, photo and reply you posted.
        Claimed businesses stay listed with no owner.
      </p>
      <button className="mt-3 text-sm font-medium text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 cursor-pointer">
        Delete my account
      </button>
    </form>
  );
}
