"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/native";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registers the service worker and offers installation (Android/desktop prompt, iOS instructions). */
export function PwaClient() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isNative()) return; // the native app has its own push and needs no install prompt
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let wasDismissed = false;
    try {
      wasDismissed = localStorage.getItem("cc.installDismissed") === "1";
    } catch {
      /* ignore */
    }
    if (standalone || wasDismissed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time platform detection
      setIos(true);
      setDismissed(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || (!deferred && !ios)) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem("cc.installDismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div role="region" aria-label="Install app" className="border-b border-line bg-primary-soft">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-ink">
        {deferred ? (
          <>
            <span>Install Card Compass for quick scanning from your home screen.</span>
            <button
              className="rounded-xl bg-primary shadow-sm px-3 py-1.5 font-semibold text-on-primary"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                close();
              }}
            >
              Install app
            </button>
          </>
        ) : (
          <span>
            Install on iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>. Price alerts need the
            installed app on iOS.
          </span>
        )}
        <button onClick={close} className="ml-auto text-muted underline">
          Not now
        </button>
      </div>
    </div>
  );
}
