import "server-only";
import { z } from "zod";

const intFromEnv = (fallback: number) =>
  z.preprocess((v) => (v === undefined || v === "" ? fallback : Number(v)), z.number().int().positive());

const EnvSchema = z.object({
  CATALOG_PROVIDER: z.enum(["mock", "pokemontcg"]).default("mock"),
  POKEMONTCG_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  POKEMONTCG_BASE_URL: z.url().default("https://api.pokemontcg.io/v2"),
  POKEMONTCG_LIMIT_PER_MINUTE: intFromEnv(30),
  POKEMONTCG_LIMIT_PER_DAY_KEYED: intFromEnv(20000),
  POKEMONTCG_LIMIT_PER_DAY_KEYLESS: intFromEnv(1000),
  OCR_PROVIDER: z.enum(["mock", "vision"]).default("mock"),
  DATABASE_URL: z.string().optional().transform((v) => (v ? v : undefined)),
  CATALOG_CACHE_TTL_SECONDS: intFromEnv(86400),
  PRICE_CACHE_TTL_SECONDS: intFromEnv(21600),
  PRICE_STALE_AFTER_DAYS: intFromEnv(7),
  UPLOAD_MAX_BYTES: intFromEnv(8_000_000),
  OUTBOUND_TIMEOUT_MS: intFromEnv(8000),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      // Report which variables are wrong, never their values.
      const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid environment configuration: ${keys}`);
    }
    cached = parsed.data;
  }
  return cached;
}
