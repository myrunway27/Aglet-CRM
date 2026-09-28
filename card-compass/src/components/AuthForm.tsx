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
      await api(`/api/auth/${mode}`, "POST", mode === "signup" ? { email, password, country } : { email, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
      setBusy(false);
    }
  }

  const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base";
  return (
    <form onSubmit={submit} aria-labelledby="auth-h" className="grid max-w-md gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h1 id="auth-h" className="text-2xl font-bold">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-sm text-slate-700">An account keeps your collection, its value history and your price alerts.</p>
      <label className="text-sm font-medium">
        Email
        <input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
        {mode === "signup" && <span className="mt-1 block text-xs font-normal text-slate-600">At least 10 characters.</span>}
      </label>
      {mode === "signup" && (
        <label className="text-sm font-medium">
          Country (for delivered cost and currency)
          <select className={field} value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.entries(REGIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <button disabled={busy} className="rounded-md bg-brand-700 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "login" && (
        <a href="/forgot" className="text-sm text-brand-700 underline">
          Forgot your password?
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="text-sm font-medium text-brand-700 underline"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
