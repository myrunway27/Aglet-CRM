import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell for the Card Compass web app. The app loads your deployed
 * HTTPS site (CAP_SERVER_URL at `npx cap sync` time); `mobile-shell/` is only
 * the bundled fallback page shown when the site can't be reached.
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "https://cardcompass.example.com";
const host = new URL(serverUrl).hostname;

const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID ?? "com.example.cardcompass",
  appName: "Card Compass",
  webDir: "mobile-shell",
  server: {
    url: serverUrl,
    // Only allow http for local development against a dev server.
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [host],
    errorPath: "index.html",
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
};

export default config;
