"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNative, takeNativePhoto } from "@/lib/native";

type Status = "starting" | "live" | "denied" | "unsupported";

/**
 * Full-screen card scanner: live camera with a card-shaped guide, shutter,
 * torch (where the device supports it) and an "upload a photo" fallback.
 * Inside the native app the system camera is used instead.
 */
export function CameraScanner({ open, onClose, onImage }: { open: boolean; onClose: () => void; onImage: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({ available: false, on: false });

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isNative()) {
      // Native app: hand off to the system camera.
      void takeNativePhoto().then((f) => {
        onClose();
        if (f) onImage(f);
      });
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the scanner opens
    setStatus("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          void v.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorch({ available: Boolean(caps.torch), on: false });
        setStatus("live");
        shutterRef.current?.focus();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported");
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onClose, onImage, stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onClose();
        onImage(new File([blob], "scan.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ available: true, on });
    } catch {
      setTorch({ available: false, on: false });
    }
  }

  if (!open || isNative()) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan a card" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
          Close
        </button>
        {torch.available && (
          <button onClick={toggleTorch} aria-pressed={torch.on} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            {torch.on ? "Light on" : "Light off"}
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" aria-label="Camera preview" />
        {status === "live" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            {/* Card-shaped guide (63 × 88 mm); the dim surround comes from the huge box-shadow */}
            <div
              className="aspect-[63/88] w-[min(72vw,calc(62vh*63/88))] rounded-2xl border-4 border-white/90"
              style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.45)" }}
            />
          </div>
        )}
        {status === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm">Starting camera…</p>}
        {(status === "denied" || status === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-lg font-semibold">{status === "denied" ? "Camera access is off" : "Live camera isn't available here"}</p>
            <p className="max-w-xs text-sm text-white/80">
              {status === "denied"
                ? "Allow camera access for this site in your browser settings, or upload a photo of the card instead."
                : "You can still take or upload a photo of the card."}
            </p>
          </div>
        )}
      </div>

      <div className="grid justify-items-center gap-3 px-4 pt-3" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <p className="text-center text-sm text-white/85">
          {status === "live" ? "Fit the whole card inside the frame. Avoid glare." : "Use a photo from your camera or gallery."}
        </p>
        {status === "live" && (
          <button
            ref={shutterRef}
            onClick={capture}
            aria-label="Take photo"
            className="h-18 w-18 rounded-full border-4 border-white bg-white/25 outline-offset-4 active:bg-white/60"
            style={{ height: 72, width: 72 }}
          />
        )}
        <label className="cursor-pointer text-sm font-semibold text-white underline underline-offset-4">
          Upload a photo instead
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              stop();
              onClose();
              onImage(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}
