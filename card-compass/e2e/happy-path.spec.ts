import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (n: string) => path.join(__dirname, "..", "fixtures", "ocr", n);

test("scan a card, confirm the exact variant, see source-tagged references and no fake listing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Demo mode.")).toBeVisible();

  await page.locator("#card-photo").setInputFiles(fixture("pikachu-alpha.png"));
  await expect(page.getByRole("heading", { name: "Review matches" })).toBeVisible();
  await expect(page.getByText("025/198", { exact: true })).toBeVisible();

  // Nothing is preselected; the buyer must choose.
  const radios = page.locator('input[name="scan-candidate"]');
  expect(await radios.count()).toBeGreaterThan(0);
  for (const r of await radios.all()) await expect(r).not.toBeChecked();

  await page.getByRole("radio", { name: /Pikachu.*high confidence.*Fixture Set Alpha/ }).check();
  const form = page.getByRole("form", { name: "Confirm your exact card" });
  await expect(form).toBeVisible();

  // Submitting without the checks is blocked.
  await form.getByRole("button", { name: /Confirm and see/ }).click();
  await expect(form.getByRole("alert")).toBeVisible();

  await form.getByRole("radio", { name: /Reverse holofoil/ }).check();
  await form.getByLabel("Condition").selectOption("NM");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: /Confirm and see/ }).click();

  await expect(page).toHaveURL(/\/cards\/fxa-25\?.*finish=reverseHolofoil/);
  await expect(page.getByRole("heading", { name: "Market references" })).toBeVisible();

  const tcg = page.getByTestId("source-tcgplayer");
  await expect(tcg).toContainText("TCGplayer");
  await expect(tcg).toContainText("USD");
  await expect(tcg).toContainText(/Updated 27 Sept? 2026/);
  await expect(tcg).toContainText(/USD\s0\.55/);

  const cm = page.getByTestId("source-cardmarket");
  await expect(cm).toContainText("Cardmarket");
  await expect(cm).toContainText(/EUR\s0\.50/);

  // Demo data is labeled; reference prices are not ranked; listings are clearly demo and have no links.
  await expect(page.getByText("Demo mode.")).toBeVisible();
  await expect(page.getByText(/so we don't rank them or pick a "cheapest"/)).toBeVisible();
  const offers = page.getByTestId("offers");
  await expect(offers.getByText("Demo listings")).toBeVisible();
  await expect(offers.getByRole("link", { name: /View on eBay/ })).toHaveCount(0);
});

test("manual search works without OCR, and graded cards get a clear caveat", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Card name or number").fill("025/108");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("radio", { name: /Pikachu.*Fixture Set Beta/ }).check();
  const form = page.getByRole("form", { name: "Confirm your exact card" });
  await form.getByRole("radio", { name: /^Holofoil/ }).check();
  await form.getByRole("radio", { name: "Graded slab" }).check();
  await form.getByRole("combobox", { name: "Grader" }).selectOption("PSA");
  await form.getByRole("textbox", { name: "Grade" }).fill("9");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: /Confirm and see/ }).click();
  await expect(page.getByText(/PSA 9 graded card.*see PriceCharting for graded sales/)).toBeVisible();
  await expect(page.getByTestId("source-tcgplayer")).toContainText(/USD\s5\.80/);
});

test("variant mismatch shows 'No quote available' instead of another finish's price", async ({ page }) => {
  await page.goto("/cards/fxa-125?finish=reverseHolofoil&lang=en&grading=raw&condition=NM");
  const tcg = page.getByTestId("source-tcgplayer");
  await expect(tcg).toContainText("No quote available for the reverse holofoil finish.");
  await expect(tcg.getByText("Other finishes (not the one you confirmed)")).toBeVisible();
});

test("a card with no prices says so for each source", async ({ page }) => {
  await page.goto("/cards/fxg-6?finish=normal&lang=en&grading=raw&condition=LP");
  await expect(page.getByText("No quote available from TCGplayer for this card.")).toBeVisible();
  await expect(page.getByText("No quote available from Cardmarket for this card.")).toBeVisible();
});

test("unreadable scan offers the manual path", async ({ page }) => {
  await page.goto("/");
  await page.locator("#card-photo").setInputFiles(fixture("unreadable.png"));
  await expect(page.getByText("No catalog match.")).toBeVisible();
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.getByLabel("Card name or number")).toBeFocused();
});

test("results require a confirmed selection", async ({ page }) => {
  await page.goto("/cards/fxa-25");
  await expect(page.getByRole("heading", { name: "Confirm your card first" })).toBeVisible();
});
