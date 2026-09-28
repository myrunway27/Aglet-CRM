"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNative, onNativeNotificationTap } from "@/lib/native";

/** Inside the native app: open the page a tapped notification points at. Renders nothing. */
export function NativeBridge() {
  const router = useRouter();
  useEffect(() => {
    if (!isNative()) return;
    let off: (() => void) | undefined;
    void onNativeNotificationTap((path) => router.push(path)).then((f) => (off = f));
    return () => off?.();
  }, [router]);
  return null;
}
