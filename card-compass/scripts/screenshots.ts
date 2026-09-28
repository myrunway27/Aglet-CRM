/**
 * Captures the main screens at mobile (390px) and desktop (1280px) widths.
 * Start the app first (mock mode): npm run build && npx next start -p 3100
 * Then: npm run screenshots   (writes docs/screenshots/*.png)
 */
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "docs", "screenshots");
const FIXTURE = path.join(process.cwd(), "fixtures", "ocr", "pikachu-alpha.png");

async function run(label: string, width: number, height: number) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: true });

  await page.goto(BASE);
  await shot("1-landing");
  await page.locator("#card-photo").setInputFiles(FIXTURE);
  await page.getByRole("heading", { name: "Review matches" }).waitFor();
  await page.getByRole("radio", { name: /Fixture Set Alpha/ }).first().check();
  const form = page.getByRole("form", { name: "Confirm your exact card" });
  await form.getByRole("radio", { name: /Reverse holofoil/ }).check();
  await form.getByLabel("Condition").selectOption("NM");
  await form.getByRole("checkbox").check();
  await page.waitForTimeout(400);
  await shot("2-review-confirm");
  await form.getByRole("button", { name: /Confirm and see/ }).click();
  await page.getByRole("heading", { name: "Market references" }).waitFor();
  await page.getByText("Other finishes").first().click();
  await shot("3-results");
  await browser.close();
}

void (async () => {
  await run("mobile-390", 390, 844);
  await run("desktop-1280", 1280, 900);
  console.log("Screenshots written to", OUT);
})();
