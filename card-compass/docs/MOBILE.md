# Card Compass mobile apps (iOS + Android)

The mobile apps are **Capacitor** shells around the deployed Card Compass web app: one codebase, with native features added where they matter:

- **Camera:** `@capacitor/camera` `takePhoto`, plus a multi-photo gallery picker for bulk scan.
- **Push notifications:** APNs on iOS, Firebase Cloud Messaging on Android. The server sends them through `src/lib/native-push`.
- **Native share sheet:** for collection and trade-list links.

The same pages run in the browser as a PWA. Every native call is guarded by `Capacitor.isNativePlatform()`, and the plugins are loaded lazily.

> **Status:** the `android/` and `ios/` projects are generated and configured. The server-side push senders are unit-tested with generated keys. **I couldn't compile either app here**: the build machine has no Android SDK, and Google's SDK download server was blocked. iOS needs macOS and Xcode. Follow the steps below on your machine and test on real devices.

## How it works

```
Native shell (WKWebView / Android WebView)
  └─ loads CAP_SERVER_URL (your deployed HTTPS site)   ← the whole app, always up to date
       ├─ @capacitor/camera        → scan + bulk scan
       ├─ @capacitor/push-notifications → device token → POST /api/push/native
       └─ @capacitor/share         → share links
  mobile-shell/index.html  ← bundled fallback page when the site can't be reached

Server: price alert fires → pushToUser() → web push + FCM (Android) + APNs (iOS)
```

Loading the site remotely means web deploys update the app without store review. Apple's guideline 4.2 ("minimum functionality") can reject apps that are only a website. The native camera, push and share features are there partly for that reason. Make sure they work well before you submit.

## Prerequisites

- Node 22+, and this repo installed (`npm install`)
- The web app deployed on **HTTPS** (e.g. `https://app.yourdomain.com`)
- Android: Android Studio (includes the SDK and JDK 21)
- iOS: a Mac with Xcode 16+, and an Apple Developer account ($99/yr)

## 1. Point the apps at your site

```bash
export CAP_SERVER_URL=https://app.yourdomain.com
export CAP_APP_ID=com.yourcompany.cardcompass   # reverse-DNS, must match store listings
npx cap sync                                     # copies config + plugins into android/ and ios/
```

`capacitor.config.ts` reads both variables. Change the `appId` before your first store upload; it can't be changed afterwards. When you do, also update `applicationId` in `android/app/build.gradle` and the bundle identifier in Xcode.

## 2. Android

1. **Firebase:** create a Firebase project and add an Android app with your `CAP_APP_ID`. Download `google-services.json` into `android/app/`. The Gradle build applies the Google Services plugin automatically when that file exists.
2. **Server:** create a Firebase service account, then set:
   ```
   FCM_PROJECT_ID=your-firebase-project-id
   FCM_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
   FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
3. Build and run:
   ```bash
   npm run cap:android      # opens Android Studio → Run on a device
   ```
4. Release: in Android Studio, **Build → Generate Signed App Bundle** (`.aab`), then upload it to the Google Play Console.

Permissions declared in `AndroidManifest.xml`: `CAMERA`, `READ_MEDIA_IMAGES` (and `READ_EXTERNAL_STORAGE` up to API 32), and `POST_NOTIFICATIONS`.

## 3. iOS

1. `npm run cap:ios` opens Xcode. Set your team under **Signing & Capabilities**, and add the **Push Notifications** capability.
2. **APNs key:** in the Apple Developer portal, go to **Keys** and create a key with APNs enabled. Download the `.p8` file, then set:
   ```
   APNS_TEAM_ID=ABCDE12345
   APNS_KEY_ID=KEY1234567
   APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   APNS_BUNDLE_ID=com.yourcompany.cardcompass
   APNS_PRODUCTION=false    # true for TestFlight/App Store builds
   ```
3. Run on a real device. The simulator can't receive remote push.
4. Release: **Product → Archive**, then upload to App Store Connect and test through TestFlight.

Already configured:
- `Info.plist` has camera and photo-library usage descriptions. Apple rejects apps without them.
- `AppDelegate.swift` forwards APNs registration to the Capacitor push plugin.

## 4. Test checklist on devices

- [ ] Sign in, scan a card with the camera, and confirm it.
- [ ] Bulk scan: take photos, choose several from the gallery, and add them.
- [ ] Alerts page: tap "Turn on notifications". Create an alert that will fire, trigger `POST /api/cron/run`, and check that the notification arrives and opens the right page when tapped.
- [ ] Share a binder link from the share sheet.
- [ ] Airplane mode shows the fallback page, and "Try again" recovers.
- [ ] The Android back button and the iOS swipe-back gesture behave as expected.

## Store listing notes

- **Privacy:** photos are processed and never stored. Accounts store your email and collection. Push tokens are stored per device. Fill in Apple's privacy labels and Google's Data safety form to match.
- **Wording:** describe prices as "reference prices" and "estimates", as the app does. Don't claim "live cheapest prices".
- **Trademarks:** avoid Pokémon trademarks in the app name and icon.
