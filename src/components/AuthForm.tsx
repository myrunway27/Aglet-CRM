"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type FormState } from "@/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl border border-stone-200 p-6 mt-6">
      <h1 className="text-xl font-bold">{mode === "login" ? "Log in" : "Create your account"}</h1>
      {mode === "signup" && (
        <p className="mt-2 text-sm text-stone-600 bg-brand-50 border border-brand-100 rounded-lg p-3">
          🕶️ Your email is only used to sign in and stop fake reviews. It is{" "}
          <strong>never shown</strong> on reviews — you post under a random pen name.
        </p>
      )}
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-brand-700 text-white py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-brand-700 font-medium hover:underline"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-brand-700 font-medium hover:underline"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
