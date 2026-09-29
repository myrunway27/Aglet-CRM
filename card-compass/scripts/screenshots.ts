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
  // A fake camera (Chromium test pattern) stands in for the phone camera.
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, permissions: ["camera"] });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: true });

  await page.goto(BASE);
  await page.getByLabel("Card name or number").fill("pika");
  await page.getByRole("option").first().waitFor();
  await shot("1-landing");
  await page.getByLabel("Card name or number").fill("");
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await page.getByRole("button", { name: "Take photo" }).waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${label}-12-camera.png`) });
  await page.getByRole("dialog", { name: "Scan a card" }).getByLabel("Upload a photo instead").setInputFiles(FIXTURE);
  await page.getByText("Is this your card?").waitFor();
  await page.waitForTimeout(400);
  await shot("2-review-confirm");
  await page.getByRole("button", { name: "Yes, show prices" }).click();
  await page.getByLabel("Finish", { exact: true }).selectOption("reverseHolofoil");
  await page.waitForURL(/finish=reverseHolofoil/);
  await page.getByTestId("quick-tcgplayer").getByText(/USD\s0\.55/).waitFor();
  await page.getByText("All price details and sources").click();
  await page.getByText("Other finishes").first().click();
  await shot("3-results");

  // Account flows
  await page.goto(`${BASE}/login?next=/collection`);
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(`shots-${label}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("screenshot-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "My collection" }).waitFor();
  for (const url of [
    "/cards/fxa-25?finish=reverseHolofoil&lang=en&grading=raw&condition=NM",
    "/cards/fxa-125?finish=holofoil&lang=en&grading=raw&condition=NM",
  ]) {
    await page.goto(BASE + url);
    const add = page.getByRole("form", { name: "Add to collection" });
    await add.getByRole("button", { name: "Add to collection" }).click();
    await add.getByRole("status").waitFor();
  }
  const alert = page.getByRole("form", { name: "Create price alert" });
  await alert.getByLabel(/^Price \(/).fill("20.00");
  await alert.getByRole("button", { name: "Create alert" }).click();
  await alert.getByRole("status").waitFor();
  await page.goto(`${BASE}/collection`);
  await page.getByText("Value on TCGplayer basis").waitFor();
  await shot("4-collection");
  await page.goto(`${BASE}/alerts`);
  await page.getByRole("heading", { name: "Price alerts" }).waitFor();
  await shot("5-alerts");
  await page.goto(`${BASE}/sets/fxa`);
  await page.getByText(/You own/).waitFor();
  await shot("6-set");
  await page.goto(`${BASE}/market`);
  await page.getByRole("table").first().waitFor();
  await shot("7-market");
  await page.goto(`${BASE}/scan/bulk`);
  await page.getByLabel("Choose photos").setInputFiles([
    path.join(process.cwd(), "fixtures", "ocr", "pikachu-alpha.png"),
    path.join(process.cwd(), "fixtures", "ocr", "charizard-glare.png"),
  ]);
  await page.getByText("0 still scanning").waitFor();
  await shot("8-bulk-scan");

  await page.goto(`${BASE}/graded`);
  await page.getByLabel("PSA cert number").fill("90000001");
  await page.getByRole("button", { name: "Look up" }).click();
  await page.getByRole("radio", { name: /Charizard ex.*Fixture Set Alpha/ }).check();
  await page.getByLabel(/^Finish/).selectOption("holofoil");
  await shot("9-graded");

  await page.goto(`${BASE}/collection`);
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("Title").fill("Alex's collection");
  await page.getByLabel("Show values").check();
  await page.getByRole("button", { name: "Create link" }).click();
  const url = await page.getByLabel("Link for Alex's collection").inputValue();
  await page.goto(`${BASE}${new URL(url).pathname}`);
  await page.getByRole("heading", { name: "Alex's collection" }).waitFor();
  await shot("10-shared");

  await page.goto(`${BASE}/cards/fxa-125?finish=holofoil&lang=en&grading=graded&grader=PSA&grade=10`);
  await page.getByRole("heading", { name: "Prices for your card" }).waitFor();
  await page.getByTestId("offers").getByRole("heading").first().waitFor();
  await shot("11-graded-results");

  await page.goto(`${BASE}/`);
  await page.getByTestId("portfolio-value").waitFor();
  await page.getByRole("img", { name: /Collection value over/ }).waitFor();
  await shot("13-portfolio-home");
  await page.goto(`${BASE}/collection`);
  await page.getByRole("button", { name: "binder" }).click();
  await page.getByTestId("binder").waitFor();
  await shot("14-binder");
  await page.goto(`${BASE}/pokedex/Charizard`);
  await page.getByTestId("pokedex-grid").waitFor();
  await shot("15-pokedex");
  await browser.close();
}

void (async () => {
  await run("mobile-390", 390, 844);
  await run("desktop-1280", 1280, 900);
  console.log("Screenshots written to", OUT);
})();
