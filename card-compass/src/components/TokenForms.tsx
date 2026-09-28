"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";

const field = "mt-1 block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base";
const card = "mx-auto mt-4 grid w-full max-w-md gap-4 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:mt-10 sm:p-8";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/auth/forgot", "POST", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }
  return (
    <form onSubmit={submit} aria-labelledby="forgot-h" className={card}>
      <h1 id="forgot-h" className="text-2xl font-bold">Reset your password</h1>
      {sent ? (
        <p role="status">If an account exists for {email}, we&apos;ve sent a reset link. It expires in 1 hour.</p>
      ) : (
        <>
          <label className="text-sm font-medium">
            Email
            <input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <button className="rounded-xl bg-primary shadow-sm px-4 py-3 font-semibold text-on-primary">Send reset link</button>
        </>
      )}
      <Link href="/login" className="text-sm text-link underline">Back to sign in</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/auth/reset", "POST", { token, password });
      router.push("/collection");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }
  return (
    <form onSubmit={submit} aria-labelledby="reset-h" className={card}>
      <h1 id="reset-h" className="text-2xl font-bold">Choose a new password</h1>
      <label className="text-sm font-medium">
        New password
        <input className={field} type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-muted">At least 10 characters. This signs you out everywhere else.</span>
      </label>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="rounded-xl bg-primary shadow-sm px-4 py-3 font-semibold text-on-primary">Set password</button>
    </form>
  );
}

export function VerifyForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={card}>
      <h1 className="text-2xl font-bold">Confirm your email</h1>
      {state === "ok" ? (
        <p role="status">
          Thanks, your email is confirmed. <Link href="/account" className="text-link underline">Go to your account</Link>
        </p>
      ) : (
        <>
          <button
            onClick={async () => {
              try {
                await api("/api/auth/verify/confirm", "POST", { token });
                setState("ok");
              } catch (err) {
                setState("error");
                setError(err instanceof ClientApiError ? err.message : "Network error.");
              }
            }}
            className="rounded-xl bg-primary shadow-sm px-4 py-3 font-semibold text-on-primary"
          >
            Confirm my email
          </button>
          {state === "error" && <p role="alert" className="text-sm text-bad">{error}</p>}
        </>
      )}
    </div>
  );
}
