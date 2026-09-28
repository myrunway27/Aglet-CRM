import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (n: string) => path.join(__dirname, "..", "fixtures", "ocr", n);

/** Open the in-app scanner from the search bar and hand it a photo. */
async function scanPhoto(page: import("@playwright/test").Page, file: string) {
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Scan a card" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Upload a photo instead").setInputFiles(fixture(file));
  await expect(dialog).toBeHidden();
}

test("scan from the search bar: confident match, one tap to prices, adjust finish in place", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find any Pokémon card" })).toBeVisible();
  await expect(page.getByText("Demo mode:")).toBeVisible();

  await scanPhoto(page, "pikachu-alpha.png");
  await expect(page.getByText("Is this your card?")).toBeVisible();
  await expect(page.getByText("Fixture Set Alpha · #25/198")).toBeVisible();
  await page.getByRole("button", { name: "Yes, show prices" }).click();

  await expect(page).toHaveURL(/\/cards\/fxa-25$/);
  await expect(page.getByRole("heading", { name: "Pikachu" })).toBeVisible();
  // Defaults are assumed and flagged for checking.
  await expect(page.getByText(/We assumed the settings marked/)).toBeVisible();
  await expect(page.getByTestId("quick-tcgplayer")).toContainText(/USD\s0\.21/);

  // Change finish in place: prices update, the finish is no longer "assumed".
  await page.getByLabel("Finish", { exact: true }).selectOption("reverseHolofoil");
  await expect(page).toHaveURL(/finish=reverseHolofoil/);
  await expect(page.getByTestId("quick-tcgplayer")).toContainText(/USD\s0\.55/);
  await expect(page.getByTestId("quick-cardmarket")).toContainText(/EUR\s0\.50/);

  // Full source details are one tap away and still source-attributed.
  await page.getByText("All price details and sources").click();
  const tcg = page.getByTestId("source-tcgplayer");
  await expect(tcg).toContainText("TCGplayer");
  await expect(tcg).toContainText(/Updated 27 Sept? 2026/);
  await expect(page.getByText(/so we don't rank them or pick a "cheapest"/)).toBeVisible();

  // Listings are clearly demo and never link out.
  const offers = page.getByTestId("offers");
  await expect(offers.getByText("Demo listings")).toBeVisible();
  await expect(offers.getByRole("link", { name: /View on eBay/ })).toHaveCount(0);
});

test("type-ahead search opens a card in one tap; graded settings show a clear caveat", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Card name or number").fill("025/108");
  const option = page.getByRole("option", { name: /Pikachu.*Fixture Set Beta/ });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page).toHaveURL(/\/cards\/fxb-25$/);
  // The only priced finishes are holo + reverse; the default picks holofoil.
  await expect(page.getByLabel("Finish", { exact: true })).toHaveValue("holofoil");

  await page.getByLabel("Raw or graded").selectOption("graded");
  await expect(page).toHaveURL(/grading=graded/);
  await page.getByLabel("Grade", { exact: true }).fill("9");
  await page.getByLabel("Grade", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/grade=9/);
  await expect(page.getByText(/PSA 9 graded card.*see PriceCharting for graded sales/)).toBeVisible();
  await expect(page.getByTestId("quick-pricecharting")).toContainText(/Grade 9/);
  await expect(page.getByTestId("quick-pricecharting")).toContainText(/USD\s34\.00/);
});

test("pressing Enter shows a results list", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Card name or number").fill("Charizard");
  await page.getByLabel("Card name or number").press("Escape");
  await page.getByLabel("Card name or number").press("Enter");
  await expect(page.getByRole("heading", { name: /3 cards found/ })).toBeVisible();
  await page.getByRole("button", { name: /Charizard ex/ }).click();
  await expect(page).toHaveURL(/\/cards\/fxa-125$/);
});

test("an unsure scan asks which card it is", async ({ page }) => {
  await page.goto("/");
  await scanPhoto(page, "charizard-glare.png");
  await expect(page.getByRole("heading", { name: "Which one is yours?" })).toBeVisible();
  await expect(page.getByText("Is this your card?")).toHaveCount(0);
  await page.getByRole("button", { name: /Charizard ex.*Fixture Set Alpha/ }).click();
  await expect(page).toHaveURL(/\/cards\/fxa-125$/);
});

test("variant mismatch shows 'No price' instead of another finish's price", async ({ page }) => {
  await page.goto("/cards/fxa-125?finish=reverseHolofoil&lang=en&grading=raw&condition=NM");
  await expect(page.getByTestId("quick-tcgplayer")).toContainText("No price for this finish");
  await page.getByText("All price details and sources").click();
  const tcg = page.getByTestId("source-tcgplayer");
  await expect(tcg).toContainText("No quote available for the reverse holofoil finish.");
  await expect(tcg.getByText("Other finishes (not the one you confirmed)")).toBeVisible();
});

test("a card with no prices says so for each source", async ({ page }) => {
  await page.goto("/cards/fxg-6?finish=normal&lang=en&grading=raw&condition=LP");
  await expect(page.getByTestId("quick-tcgplayer")).toContainText("No price");
  await expect(page.getByTestId("quick-cardmarket")).toContainText("No price");
  await page.getByText("All price details and sources").click();
  await expect(page.getByText("No quote available from TCGplayer for this card.")).toBeVisible();
  await expect(page.getByText("No quote available from Cardmarket for this card.")).toBeVisible();
});

test("an unreadable scan gives tips and a way to type instead", async ({ page }) => {
  await page.goto("/");
  await scanPhoto(page, "unreadable.png");
  await expect(page.getByRole("heading", { name: "We couldn't read that card" })).toBeVisible();
  await page.getByRole("button", { name: "Type instead" }).click();
  await expect(page.getByLabel("Card name or number")).toBeFocused();
});

test("the live camera opens with a card guide and can be closed", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "fake camera flags are Chromium-only");
  await page.goto("/");
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Scan a card" });
  // With a (fake) camera the shutter appears; without one we fall back to upload.
  await expect(dialog.getByRole("button", { name: "Take photo" }).or(dialog.getByText("Live camera isn't available here"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("opening a card without settings uses sensible defaults", async ({ page }) => {
  await page.goto("/cards/fxa-25");
  await expect(page.getByLabel("Finish", { exact: true })).toHaveValue("normal");
  await expect(page.getByLabel("Condition")).toHaveValue("NM");
  await expect(page.getByLabel("Language")).toHaveValue("en");
  await expect(page.getByRole("group", { name: "Your card" }).getByText("check", { exact: true })).toHaveCount(3);
});

test("recently viewed cards appear on the home page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Card name or number").fill("Mew");
  await page.getByRole("option", { name: /Mew/ }).first().click();
  await expect(page).toHaveURL(/\/cards\/fxg-151$/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Mew · Fixture Set Gamma #151/ })).toBeVisible();
});
