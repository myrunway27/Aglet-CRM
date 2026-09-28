"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { isNative, nativePlatform, registerNativePush } from "@/lib/native";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ serverEnabled, nativeEnabled }: { serverEnabled: boolean; nativeEnabled?: { ios: boolean; android: boolean } }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const native = isNative();

  useEffect(() => {
    if (native) return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection on mount
    setSupported(ok);
    if (ok) navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setSub).catch(() => undefined);
  }, [native]);

  if (native) {
    const platform = nativePlatform() === "ios" ? "ios" : "android";
    if (!nativeEnabled?.[platform]) {
      return <p className="text-sm text-muted">Notifications for the app aren&apos;t configured on this server yet. Alerts still appear below.</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={async () => {
            setMsg(null);
            const r = await registerNativePush();
            if (!r) return setMsg("Notifications were not allowed.");
            try {
              await api("/api/push/native", "POST", r);
              setMsg("Notifications are on for this device.");
            } catch {
              setMsg("Couldn't turn on notifications. Try again.");
            }
          }}
          className="rounded-xl bg-primary shadow-sm px-3 py-2 font-semibold text-on-primary"
        >
          Turn on notifications
        </button>
        {msg && <span role="status">{msg}</span>}
      </div>
    );
  }

  if (!serverEnabled || !key) {
    return <p className="text-sm text-muted">Push notifications aren&apos;t configured on this server. Alerts still appear below.</p>;
  }
  if (supported === false) {
    return (
      <p className="text-sm text-muted">
        This browser doesn&apos;t support push. On iPhone, install the app to your home screen first (iOS 16.4+).
      </p>
    );
  }

  async function enable() {
    setMsg(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setMsg("Notifications were not allowed.");
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key!) });
      await api("/api/push/subscribe", "POST", s.toJSON());
      setSub(s);
      setMsg("Push notifications are on for this device.");
    } catch {
      setMsg("Couldn't turn on notifications. Try again.");
    }
  }

  async function disable() {
    if (!sub) return;
    await api("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
    setSub(null);
    setMsg("Push notifications are off for this device.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {sub ? (
        <button onClick={disable} className="rounded-lg border border-line-strong px-3 py-2">
          Turn off push on this device
        </button>
      ) : (
        <button onClick={enable} className="rounded-xl bg-primary shadow-sm px-3 py-2 font-semibold text-on-primary">
          Turn on push notifications
        </button>
      )}
      {msg && <span role="status">{msg}</span>}
    </div>
  );
}
