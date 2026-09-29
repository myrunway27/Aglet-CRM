"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";
import { REGIONS } from "@/lib/regions";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(
        `/api/auth/${mode}`,
        "POST",
        mode === "signup" ? { email, password, country } : { email, password },
      );
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
      setBusy(false);
    }
  }

  const field =
    "mt-1 block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base";
  return (
    <form
      onSubmit={submit}
      aria-labelledby="auth-h"
      className="mx-auto mt-4 grid w-full max-w-md gap-4 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:mt-10 sm:p-8"
    >
      <h1 id="auth-h" className="text-2xl font-bold">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-sm text-ink-2">
        An account keeps your collection, its value history and your price
        alerts.
      </p>
      <label className="text-sm font-medium">
        Email
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="text-sm font-medium">
        Password
        <input
          className={field}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={10}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <span className="mt-1 block text-xs font-normal text-muted">
            At least 10 characters.
          </span>
        )}
      </label>
      {mode === "signup" && (
        <label className="text-sm font-medium">
          Country (for delivered cost and currency)
          <select
            className={field}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {Object.entries(REGIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-xl bg-primary shadow-sm px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
      >
        {busy
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>
      {mode === "signup" && (
        <p className="text-xs text-muted">
          By creating an account you agree to the{" "}
          <a href="/terms" className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy
          </a>{" "}
          notice.
        </p>
      )}
      {mode === "login" && (
        <a href="/forgot" className="text-sm text-link underline">
          Forgot your password?
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="text-sm font-medium text-link underline"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
