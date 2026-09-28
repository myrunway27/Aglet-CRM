"use client";

import { Capacitor } from "@capacitor/core";

/**
 * Native (Capacitor) helpers. Every function is safe to import on the web: the
 * plugins are loaded lazily and only used inside the iOS/Android app.
 */
export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform() as "ios" | "android" | "web";

async function toFile(webPath: string, name: string): Promise<File> {
  const blob = await (await fetch(webPath)).blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], `${name}.${type.split("/")[1] ?? "jpg"}`, { type });
}

/** Open the native camera. Resolves null if the user cancels. */
export async function takeNativePhoto(): Promise<File | null> {
  const { Camera } = await import("@capacitor/camera");
  try {
    const r = await Camera.takePhoto({ quality: 85, targetWidth: 2000, targetHeight: 2000, correctOrientation: true, includeMetadata: false });
    return r.webPath ? toFile(r.webPath, "card") : null;
  } catch {
    return null; // cancelled or permission denied
  }
}

/** Pick several photos from the gallery (bulk scan). */
export async function chooseNativePhotos(limit = 50): Promise<File[]> {
  const { Camera } = await import("@capacitor/camera");
  try {
    const r = await Camera.chooseFromGallery({ allowMultipleSelection: true, limit, quality: 85, targetWidth: 2000, targetHeight: 2000, correctOrientation: true });
    return Promise.all(r.results.filter((m) => m.webPath).map((m, i) => toFile(m.webPath!, `card-${i + 1}`)));
  } catch {
    return [];
  }
}

/** Ask for notification permission and register with APNs/FCM. Resolves the device token, or null. */
export async function registerNativePush(): Promise<{ token: string; platform: "ios" | "android" } | null> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { token: string; platform: "ios" | "android" } | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    void PushNotifications.addListener("registration", (t) => finish({ token: t.value, platform: nativePlatform() === "ios" ? "ios" : "android" }));
    void PushNotifications.addListener("registrationError", () => finish(null));
    void PushNotifications.register();
    setTimeout(() => finish(null), 15_000);
  });
}

/** Route taps on native notifications to the (same-origin) page they point at. */
export async function onNativeNotificationTap(go: (path: string) => void): Promise<() => void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const h = await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
    const url = (a.notification.data as { url?: unknown } | undefined)?.url;
    if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) go(url);
  });
  return () => void h.remove();
}

/** Native share sheet, falling back to the Web Share API, then the clipboard. */
export async function shareLink(title: string, url: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, url, dialogTitle: "Share" });
      return "shared";
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
