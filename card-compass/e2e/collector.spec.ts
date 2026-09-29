import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const fixture = (n: string) => path.join(__dirname, "..", "fixtures", "ocr", n);

async function signUp(page: Page, label: string) {
  await page.goto("/login?next=/collection");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(`${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My collection" })).toBeVisible();
}

test("bulk scan, binders, profit/loss, CSV export + import", async ({ page }, info) => {
  await signUp(page, `bulk-${info.project.name}`);

  await page.goto("/scan/bulk");
  await page.getByLabel("Choose photos").setInputFiles([fixture("pikachu-alpha.png"), fixture("pikachu-beta-fr-rotated.png"), fixture("unreadable.png")]);
  const rows = page.getByTestId("bulk-row");
  await expect(rows).toHaveCount(3);
  await expect(page.getByText("0 still scanning")).toBeVisible({ timeout: 15_000 });
  // High-confidence matches are pre-selected but flagged; finish still has to be chosen.
  await expect(rows.nth(0).getByText(/pre-selected: high confidence/)).toBeVisible();
  await rows.nth(0).getByLabel("Finish").selectOption("reverseHolofoil");
  await rows.nth(1).getByLabel("Finish").selectOption("holofoil");
  await expect(rows.nth(2).getByText("No match.")).toBeVisible();
  await page.getByRole("button", { name: "Add 2 cards to collection" }).click();
  await expect(page.getByText("Please confirm you've checked each card.")).toBeVisible();
  await page.getByLabel(/I checked the set, number and finish/).check();
  await page.getByRole("button", { name: "Add 2 cards to collection" }).click();
  await expect(page.getByText("Added 2 cards to your collection.")).toBeVisible();

  // Purchase price -> profit/loss
  await page.goto("/cards/fxa-125?finish=holofoil&lang=en&grading=raw&condition=NM");
  const add = page.getByRole("form", { name: "Add to collection" });
  await add.getByLabel(/Paid each/).fill("20.00");
  await add.getByRole("button", { name: "Add to collection" }).click();
  await expect(add.getByRole("status")).toBeVisible();

  await page.goto("/collection");
  await expect(page.getByText(/3 cards\./)).toBeVisible();
  await expect(page.getByText(/Profit\/loss:\s*\+USD\s2\.50 \(\+12\.5%\)/)).toBeVisible();

  // Binders
  await page.getByLabel("New binder name").fill("Trade");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trade", pressed: true })).toBeVisible();
  await expect(page.getByText("No cards in this binder yet.")).toBeVisible();
  await page.getByRole("button", { name: "All cards" }).click();
  await page.getByRole("button", { name: "list", exact: true }).click();
  await page.getByLabel("Binder for Charizard ex").selectOption({ label: "Trade" });
  await page.getByRole("button", { name: "Trade" }).click();
  await expect(page.getByText(/1 card in Trade/)).toBeVisible();

  // Export
  const csv = await (await page.request.get("/api/collection/export")).text();
  expect(csv.split("\r\n")[0]).toBe("catalog_id,name,set_name,number,finish,language,grading,condition,grader,grade,quantity,purchase_price,purchase_currency,binder,cert_number");
  expect(csv).toContain("fxa-125,Charizard ex,Fixture Set Alpha,125,holofoil,en,raw,NM,,,1,20.00,USD,Trade,");

  // Import with preview
  await page.getByRole("button", { name: "All cards" }).click();
  await page.getByRole("button", { name: "Import CSV" }).click();
  await page.getByLabel("CSV file").setInputFiles({
    name: "cards.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("catalog_id,finish,quantity,binder\nfxg-151,holofoil,2,Vault\nnope-1,normal,1,\n"),
  });
  await expect(page.getByText(/1 row ready to import/)).toBeVisible();
  await expect(page.getByText(/Line 3: Card "nope-1" not found/)).toBeVisible();
  await page.getByRole("button", { name: "Import 1 row" }).click();
  await expect(page.getByText("Imported 1 card.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vault" })).toBeVisible();
  await expect(page.getByText(/5 cards\./)).toBeVisible();

  // Set completion
  await page.goto("/sets");
  await expect(page.getByRole("link", { name: /Fixture Set Alpha\s*2 of 4 cards/ })).toBeVisible();
  await page.getByRole("link", { name: /Fixture Set Alpha/ }).click();
  await page.getByRole("button", { name: "missing" }).click();
  await page.getByRole("button", { name: "Add to wishlist Raichu" }).click();
  await expect(page.getByText("On wishlist")).toBeVisible();
});

test("wishlist with target price creates an alert; history charts and market movers show demo data", async ({ page }, info) => {
  await signUp(page, `wish-${info.project.name}`);
  await page.goto("/cards/fxa-25?finish=reverseHolofoil&lang=en&grading=raw&condition=NM");

  await expect(page.getByRole("heading", { name: "Price history" })).toBeVisible();
  await expect(page.getByRole("img", { name: /TCGplayer market price, Reverse holofoil \(demo\), \d+ daily values/ })).toBeVisible();

  const wish = page.getByRole("form", { name: "Add to wishlist" });
  await wish.getByLabel(/Target price/).fill("0.40");
  await wish.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(wish.getByRole("status")).toHaveText("On your wishlist, with a price alert.");

  await page.goto("/wishlist");
  await expect(page.getByText("Target: below USD 0.40 (alert on)")).toBeVisible();
  await page.goto("/alerts");
  await expect(page.getByText(/goes below\s*USD\s0\.40/)).toBeVisible();
  await page.goto("/wishlist");
  await page.getByRole("button", { name: "Remove Pikachu" }).click();
  await expect(page.getByText("Your wishlist is empty.")).toBeVisible();
  await page.goto("/alerts");
  await expect(page.getByText("No alerts yet.")).toBeVisible();

  await page.goto("/market");
  await expect(page.getByRole("heading", { name: "Market movers" })).toBeVisible();
  await expect(page.getByText("Demo mode:")).toBeVisible();
  const tables = page.getByRole("table");
  await expect(tables.first().getByRole("row")).not.toHaveCount(1);
});
