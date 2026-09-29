import "server-only";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const optionalInt = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : fallback))
    .pipe(z.number().int().positive());

const schema = z.object({
  DATABASE_URL: optionalString,
  CATALOG_PROVIDER: z.enum(["mock", "pokemontcg"]).default("mock"),
  POKEMONTCG_API_KEY: optionalString,
  POKEMONTCG_BASE_URL: z
    .string()
    .url()
    .default("https://api.pokemontcg.io/v2")
    // Fixed upstream host: the base URL is operator config, never user input.
    .refine((u) => new URL(u).protocol === "https:", "must be https"),
  POKEMONTCG_LIMIT_PER_MINUTE: optionalInt(30),
  POKEMONTCG_LIMIT_PER_DAY: optionalString,
  POKEMONTCG_TIMEOUT_MS: optionalInt(8000),
  CATALOG_CACHE_TTL_SECONDS: optionalInt(86_400),
  PRICE_CACHE_TTL_SECONDS: optionalInt(21_600),
  PRICE_STALE_AFTER_DAYS: optionalInt(7),
  OCR_PROVIDER: z.enum(["mock", "google"]).default("mock"),
  GOOGLE_CLOUD_VISION_API_KEY: optionalString,
  GOOGLE_CLOUD_VISION_TIMEOUT_MS: optionalInt(10_000),
  MAX_UPLOAD_BYTES: optionalInt(8_000_000),
  SCAN_LIMIT_PER_MINUTE: optionalInt(20),
  AUTH_LIMIT_PER_MINUTE: optionalInt(5),
  // Live offers: "none" hides the section, "mock" shows labeled demo listings.
  OFFERS_PROVIDER: z.enum(["none", "mock", "ebay"]).default("mock"),
  EBAY_CLIENT_ID: optionalString,
  EBAY_CLIENT_SECRET: optionalString,
  EBAY_MARKETPLACES: z.string().default("EBAY_US,EBAY_GB,EBAY_DE"),
  EBAY_LIMIT_PER_DAY: optionalInt(5000),
  EBAY_LIMIT_PER_MINUTE: optionalInt(60),
  EBAY_MIN_FEEDBACK_PCT: optionalInt(98),
  EBAY_MIN_FEEDBACK_SCORE: optionalInt(20),
  // Marketplace account-deletion notifications (required by eBay for production keys).
  EBAY_VERIFICATION_TOKEN: optionalString,
  EBAY_DELETION_ENDPOINT: optionalString,
  FX_PROVIDER: z.enum(["mock", "ecb"]).default("mock"),
  PRICECHARTING_PROVIDER: z.enum(["none", "mock", "live"]).default("mock"),
  PRICECHARTING_TOKEN: optionalString,
  PRICECHARTING_LIMIT_PER_MINUTE: optionalInt(30),
  PRICECHARTING_LIMIT_PER_DAY: optionalInt(5000),
  PSA_PROVIDER: z.enum(["none", "mock", "live"]).default("mock"),
  PSA_API_TOKEN: optionalString,
  PSA_LIMIT_PER_DAY: optionalInt(100),
  CRON_SECRET: optionalString,
  // Public base URL used in emailed links (never derived from the Host header).
  // Shown on /privacy and /terms. While unset, those pages are marked as drafts.
  LEGAL_OPERATOR_NAME: optionalString,
  LEGAL_CONTACT_EMAIL: optionalString,
  APP_URL: z.string().url().default("http://localhost:3000"),
  // "outbox" writes emails to ./.outbox (dev/test), "resend" sends via the Resend API, "none" disables email.
  MAIL_PROVIDER: z.enum(["none", "outbox", "resend"]).default("outbox"),
  MAIL_FROM: z.string().default("Card Compass <no-reply@example.com>"),
  RESEND_API_KEY: optionalString,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: optionalString,
  // Native app push: FCM (Android) service account and APNs (iOS) .p8 token auth.
  FCM_PROJECT_ID: optionalString,
  FCM_CLIENT_EMAIL: optionalString,
  FCM_PRIVATE_KEY: optionalString,
  APNS_TEAM_ID: optionalString,
  APNS_KEY_ID: optionalString,
  APNS_PRIVATE_KEY: optionalString,
  APNS_BUNDLE_ID: optionalString,
  APNS_PRODUCTION: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type Env = ReturnType<typeof loadEnv>;

export function loadEnv(source: Record<string, string | undefined> = process.env) {
  const e = schema.parse(source);
  // Documented Pokémon TCG API limits (28 Sep 2026): 20,000/day keyed, 1,000/day keyless.
  const perDay = e.POKEMONTCG_LIMIT_PER_DAY
    ? Number(e.POKEMONTCG_LIMIT_PER_DAY)
    : e.POKEMONTCG_API_KEY
      ? 20_000
      : 1_000;
  return { ...e, POKEMONTCG_LIMIT_PER_DAY: perDay };
}

let cached: Env | undefined;
export function env(): Env {
  cached ??= loadEnv();
  return cached;
}
