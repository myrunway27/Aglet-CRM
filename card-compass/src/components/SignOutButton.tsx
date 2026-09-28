"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="font-semibold text-bad"
      onClick={async () => {
        await api("/api/auth/logout", "POST", {}).catch(() => undefined);
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
