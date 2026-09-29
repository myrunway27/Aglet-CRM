import { expect, test, type Page } from "@playwright/test";

const RESULTS = "/cards/fxa-25?finish=reverseHolofoil&lang=en&grading=raw&condition=NM";

async function signUp(page: Page, email: string) {
  await page.goto("/login?next=/collection");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole("heading", { name: "My collection" })).toBeVisible();
}

test("listings are verified, ranked by delivered cost, and recalculated per buyer country", async ({ page }) => {
  await page.goto(RESULTS);
  const offers = page.getByTestId("offers");
  await expect(offers.getByRole("heading", { name: "Listings delivered to United States" })).toBeVisible();
  await expect(offers.getByText("Demo listings")).toBeVisible();
  const ranked = offers.getByRole("list", { name: /Verified listings/ });
  await expect(ranked.getByRole("listitem").first()).toContainText("Lowest estimated delivered cost");
  await expect(ranked.getByRole("listitem").first()).toContainText("demo_cards_us");
  await expect(offers.getByText(/Not your card \(\d+\), excluded/)).toBeVisible();
  await expect(offers.getByText(/Matches with total unknown/)).toBeVisible();

  await page.getByLabel("Deliver to").selectOption("DE");
  await expect(offers.getByRole("heading", { name: "Listings delivered to Germany" })).toBeVisible();
  const first = offers.getByRole("list", { name: /Verified listings/ }).getByRole("listitem").first();
  await expect(first).toContainText("demo_karten_de");
  await expect(first).toContainText(/EUR\s2\.20/); // 0.60 + 1.60 domestic
  await expect(offers.getByText(/Import VAT \(19%\)/).first()).toBeVisible(); // US listing into Germany
});

test("account: collection value, history and a price alert that fires via the scheduled job", async ({ page, request }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;
  await signUp(page, email);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();

  await page.goto(RESULTS);
  const add = page.getByRole("form", { name: "Add to collection" });
  await add.getByLabel("Quantity").fill("2");
  await add.getByRole("button", { name: "Add to collection" }).click();
  await expect(add.getByRole("status")).toHaveText("Added to your collection.");

  const alert = page.getByRole("form", { name: "Create price alert" });
  await alert.getByLabel("When it goes").selectOption("above");
  await alert.getByLabel(/^Price \(USD\)/).fill("0.10");
  await alert.getByRole("button", { name: "Create alert" }).click();
  await expect(alert.getByRole("status")).toContainText("Alert created");

  await page.getByRole("link", { name: "Collection" }).click();
  await expect(page.getByText("Value on TCGplayer basis")).toBeVisible();
  await expect(page.getByText(/USD\s1\.10/).first()).toBeVisible(); // 2 × 0.55
  await expect(page.getByText(/EUR\s1\.00/).first()).toBeVisible(); // 2 × 0.50
  await expect(page.getByTestId("portfolio-value")).toContainText(/USD\s1\.10/);

  const denied = await request.post("/api/cron/run", { headers: { Authorization: "Bearer wrong" } });
  expect(denied.status()).toBe(401);
  const run = await request.post("/api/cron/run", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(run.ok()).toBe(true);
  expect((await run.json()).alerts.triggered).toBeGreaterThanOrEqual(1);

  await page.goto("/alerts");
  await expect(page.getByRole("link", { name: /Pikachu.*is above USD\s0\.10/ })).toBeVisible();
  await expect(page.getByText(/goes above/)).toBeVisible();
});

test("signed-out users are sent to sign in, and cross-origin writes are refused", async ({ page, request }) => {
  await page.goto("/collection");
  await expect(page).toHaveURL(/\/login\?next=%2Fcollection|\/login\?next=\/collection/);
  const res = await request.post("/api/collection", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: {},
  });
  expect(res.status()).toBe(400);
});

test("installable: manifest, icons and service worker are served", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBe(true);
  const manifest = await m.json();
  expect(manifest).toMatchObject({ name: "Card Compass", display: "standalone", start_url: "/" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(await sw.text()).toContain('addEventListener("push"');
});
