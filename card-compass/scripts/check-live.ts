/**
 * Checks each configured integration against the real service, once, with
 * your keys. Loads .env / .env.local like Next.js does. Demo ("mock") providers
 * are skipped. Nothing is written to your database.
 *
 *   npm run check:live
 *   PSA_TEST_CERT=12345678 CHECK_MAIL_TO=you@example.com npm run check:live
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type Result = { name: string; status: "ok" | "fail" | "skip"; detail: string };
const results: Result[] = [];

async function check(name: string, fn: () => Promise<string | { skip: string }>) {
  try {
    const r = await fn();
    results.push(typeof r === "string" ? { name, status: "ok", detail: r } : { name, status: "skip", detail: r.skip });
  } catch (err) {
    results.push({ name, status: "fail", detail: (err instanceof Error ? err.message : String(err)).trim().split("\n")[0] });
  }
}

async function main() {
  const { env } = await import("../src/lib/env");
  const e = env();
  const { getCatalog } = await import("../src/lib/catalog");
  const { getOcr } = await import("../src/lib/ocr");
  const { getFx } = await import("../src/lib/fx");
  const { getOfferProvider } = await import("../src/lib/offers");
  const { getPcProvider } = await import("../src/lib/pricecharting");
  const { getPsa } = await import("../src/lib/psa");

  const catalog = getCatalog();
  let sample: Awaited<ReturnType<typeof catalog.searchText>>[number] | undefined;

  await check("Database", async () => {
    if (!e.DATABASE_URL) return { skip: "DATABASE_URL not set" };
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    try {
      await db.$queryRaw`SELECT 1`;
      const users = await db.user.count();
      return `connected, ${users} users`;
    } finally {
      await db.$disconnect();
    }
  });

  await check("Card catalog + prices", async () => {
    const found = await catalog.searchText("Charizard");
    if (!found.length) throw new Error("search for Charizard returned no cards");
    sample = found[0];
    const p = await catalog.getCard(sample.catalogId);
    const src = [p.tcgplayer?.prices && "TCGplayer", p.cardmarket?.prices && "Cardmarket"].filter(Boolean).join(" + ") || "no prices";
    const note = e.CATALOG_PROVIDER === "mock" ? " (DEMO data: set CATALOG_PROVIDER=pokemontcg)" : "";
    return `${found.length} results; ${sample.name} ${sample.setName} #${sample.number}: ${src}${note}`;
  });

  await check("Card photo reading (OCR)", async () => {
    const ocr = getOcr();
    if (ocr.id === "mock") return { skip: "demo OCR (set OCR_PROVIDER=google)" };
    const img = await readFile(path.join(process.cwd(), "fixtures", "ocr", "pikachu-alpha.png"));
    const r = await ocr.extractText(img, "image/png");
    if (!r.text.trim()) throw new Error("no text read from the test image");
    return `read ${r.text.length} characters, e.g. "${r.text.replace(/\s+/g, " ").slice(0, 40)}"`;
  });

  await check("Exchange rates", async () => {
    const r = await getFx().getRates();
    if (r.source === "demo") return { skip: "demo rates (set FX_PROVIDER=ecb)" };
    return `${r.source} ${r.date}, ${Object.keys(r.rates).length} currencies (USD ${r.rates.USD})`;
  });

  await check("eBay listings", async () => {
    const offers = getOfferProvider();
    if (!offers) return { skip: "listings off (OFFERS_PROVIDER=none)" };
    if (offers.id === "mock") return { skip: "demo listings (set OFFERS_PROVIDER=ebay)" };
    if (!sample) throw new Error("needs the catalog check to pass first");
    const l = await offers.search({ cardName: sample.name, number: sample.number, setPrintedTotal: sample.setPrintedTotal, buyerCountry: "US", catalogId: sample.catalogId });
    return `${l.length} listings for ${sample.name}`;
  });

  await check("eBay account-deletion endpoint", async () => {
    if (!e.EBAY_VERIFICATION_TOKEN) return { skip: "EBAY_VERIFICATION_TOKEN not set (needed before eBay issues production keys)" };
    const url = e.EBAY_DELETION_ENDPOINT ?? `${e.APP_URL.replace(/\/$/, "")}/api/ebay/account-deletion`;
    const res = await fetch(`${url}?challenge_code=check-live`);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return `${url} answers the challenge`;
  });

  await check("PriceCharting", async () => {
    const pc = getPcProvider();
    if (!pc) return { skip: "off (PRICECHARTING_PROVIDER=none)" };
    if (pc.id === "mock") return { skip: "demo (set PRICECHARTING_PROVIDER=live)" };
    if (!sample) throw new Error("needs the catalog check to pass first");
    const products = await pc.search(sample);
    return `${products.length} products for ${sample.name}${products[0] ? `, e.g. "${products[0].productName}" (${products[0].consoleName})` : ""}`;
  });

  await check("PSA cert lookup", async () => {
    const psa = getPsa();
    if (!psa) return { skip: "off (PSA_PROVIDER=none)" };
    if (psa.id === "mock") return { skip: "demo (set PSA_PROVIDER=live)" };
    const cert = process.env.PSA_TEST_CERT;
    if (!cert) return { skip: "set PSA_TEST_CERT to a real cert number to test" };
    const c = await psa.lookup(cert);
    return `cert ${cert}: ${JSON.stringify(c).slice(0, 80)}`;
  });

  await check("Email", async () => {
    if (e.MAIL_PROVIDER !== "resend") return { skip: `MAIL_PROVIDER=${e.MAIL_PROVIDER}` };
    const to = process.env.CHECK_MAIL_TO;
    if (!to) return { skip: "set CHECK_MAIL_TO to send a test email" };
    const { sendMail } = await import("../src/lib/mail");
    if (!(await sendMail({ to, subject: "Card Compass test email", text: "If you can read this, email sending works." }))) throw new Error("send failed");
    return `sent to ${to}`;
  });

  await check("Launch settings", async () => {
    const missing = [
      !e.APP_URL.startsWith("https://") && "APP_URL is not https",
      !e.CRON_SECRET && "CRON_SECRET",
      !e.NEXT_PUBLIC_VAPID_PUBLIC_KEY && "web push keys",
      !e.LEGAL_OPERATOR_NAME && "LEGAL_OPERATOR_NAME",
      !e.LEGAL_CONTACT_EMAIL && "LEGAL_CONTACT_EMAIL",
    ].filter(Boolean);
    if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
    return "all set";
  });

  const icon = { ok: "✓", fail: "✗", skip: "–" };
  for (const r of results) console.log(`${icon[r.status]} ${r.name.padEnd(32)} ${r.detail}`);
  process.exitCode = results.some((r) => r.status === "fail") ? 1 : 0;
}

void main();
