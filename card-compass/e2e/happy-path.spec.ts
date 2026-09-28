import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (f: string) => path.resolve(__dirname, "../fixtures/scans", f);

test("scan → choose exact printing → source-tagged references, no fake listings", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("scan-input").setInputFiles(fixture("pikachu-dsa.png"));

  const candidates = page.getByTestId("candidates");
  await expect(candidates).toBeVisible();
  await expect(candidates.getByRole("listitem").first()).toContainText("Demo Set Alpha");
  await expect(candidates.getByRole("listitem").first()).toContainText("Set code DSA found on card");

  await page.getByRole("button", { name: "Select Pikachu, Demo Set Alpha number 25" }).click();

  const confirm = page.getByRole("button", { name: "Confirm and view references" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Reverse holofoil").check();
  await page.getByLabel(/I checked that the set symbol/).check();
  await confirm.click();

  await expect(page).toHaveURL(/\/cards\/mock%3Ademo-a-25\?.*finish=reverseHolofoil/);
  await expect(page.getByRole("heading", { name: "Pikachu" })).toBeVisible();
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market references" })).toBeVisible();

  const tcg = page.getByTestId("source-tcgplayer");
  await expect(tcg).toContainText("USD");
  await expect(tcg).toContainText("Market price");
  await expect(tcg).toContainText("USD 0.60");
  await expect(tcg).toContainText("DEMO DATA");
  const cm = page.getByTestId("source-cardmarket");
  await expect(cm).toContainText("EUR 0.55");

  // Live offers exist only as a disabled placeholder; there are no listing links anywhere.
  await expect(page.getByTestId("live-offers")).toContainText("Not connected");
  await expect(page.locator("main a[href^='http']")).toHaveCount(0);
  await expect(page.getByText(/cheapest/i)).toHaveCount(1);
  await expect(page.getByTestId("live-offers").getByText(/cheapest/i)).toBeVisible();
});

test("manual search works without OCR, and missing data shows No quote available", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("e.g. Pikachu 025/198").fill("pikachu 58/102");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /Select Pikachu, Demo Set Gamma number 58/ }).click();
  await page.getByLabel("Normal (non-holo)").check();
  await page.getByLabel(/I checked that the set symbol/).check();
  await page.getByRole("button", { name: "Confirm and view references" }).click();

  await expect(page.getByTestId("source-tcgplayer")).toContainText("No quote available");
  await expect(page.getByTestId("source-cardmarket")).toContainText("No quote available");
  await expect(page.getByText(/\$0|USD 0\.00|EUR 0\.00/)).toHaveCount(0);
});

test("stale references are flagged and 'None of these' returns to search", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("scan-input").setInputFiles(fixture("charizard-glare.png"));
  await expect(page.getByTestId("candidates")).toBeVisible();
  await page.getByRole("button", { name: "None of these: search manually" }).click();
  await expect(page.getByPlaceholder("e.g. Pikachu 025/198")).toBeFocused();

  await page.getByPlaceholder("e.g. Pikachu 025/198").fill("charizard ex");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /Select Charizard ex/ }).click();
  await page.getByLabel(/I checked that the set symbol/).check();
  await page.getByRole("button", { name: "Confirm and view references" }).click();
  await expect(page.getByTestId("source-cardmarket")).toContainText("Stale");
  await expect(page.getByTestId("source-tcgplayer")).not.toContainText("Stale");
});

test("unsupported upload shows a clear error", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("scan-input").setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  const alert = page.getByRole("alert").filter({ hasText: "JPEG, PNG or WebP" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Retry" })).toHaveCount(0);
});

test("rate-limited source shows a 429 state with retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/cards/*/prices*", (route) => {
    calls++;
    if (calls === 1) {
      return route.fulfill({
        status: 429,
        headers: { "Retry-After": "30", "content-type": "application/json" },
        body: JSON.stringify({ error: { code: "rate_limited", message: "The card data source is busy. Please retry shortly." } }),
      });
    }
    return route.continue();
  });
  await page.goto("/cards/mock%3Ademo-a-25?finish=normal&language=English&grading=raw&condition=Near%20Mint");
  await expect(page.getByRole("heading", { name: "Too many requests" })).toBeVisible();
  await expect(page.getByText(/Try again in about 30 s/)).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Market references" })).toBeVisible();
});
