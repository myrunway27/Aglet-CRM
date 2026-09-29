import { expect, test, type Page } from "@playwright/test";

async function signUpWithCards(page: Page, label: string) {
  await page.goto("/login?next=/collection");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(`${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My collection" })).toBeVisible();
  for (const url of ["/cards/fxa-125?finish=holofoil&lang=en&grading=raw&condition=NM", "/cards/fxb-25?finish=holofoil&lang=en&grading=raw&condition=NM"]) {
    await page.goto(url);
    const add = page.getByRole("form", { name: "Add to collection" });
    await add.getByRole("button", { name: "Add to collection" }).click();
    await expect(add.getByRole("status")).toBeVisible();
  }
}

test("signed-in home is a portfolio: value, change, chart, movers, source + range", async ({ page }, info) => {
  await signUpWithCards(page, `pf-${info.project.name}`);
  await page.goto("/");
  const pf = page.getByTestId("portfolio");
  await expect(pf.getByText(/Collection value · TCGplayer/)).toBeVisible();
  await expect(page.getByTestId("portfolio-value")).toHaveText(/USD\s28\.30/); // 22.50 + 5.80
  await expect(pf.getByRole("img", { name: /Collection value over \d+ days/ })).toBeVisible(); // seeded demo history
  await expect(pf.getByText("Biggest gains")).toBeVisible();
  await expect(pf.getByText(/2 of 2 cards priced/)).toBeVisible();

  await pf.getByRole("button", { name: "Cardmarket" }).click();
  await expect(page.getByTestId("portfolio-value")).toHaveText(/EUR\s25\.30/); // 19.90 + 5.40, never mixed with USD
  await pf.getByRole("button", { name: "90D" }).click();
  await expect(pf.getByRole("button", { name: "90D" })).toHaveAttribute("aria-pressed", "true");
  await expect(pf.getByText(/90 days/).first()).toBeVisible();
});

test("collection opens as a picture grid with insight filters and a binder view", async ({ page }, info) => {
  await signUpWithCards(page, `grid-${info.project.name}`);
  await page.goto("/collection");
  const grid = page.getByTestId("card-grid");
  await expect(grid.getByRole("link")).toHaveCount(2);
  await page.getByTestId("insights").getByRole("button", { name: /Double Rare/ }).click();
  await expect(grid.getByRole("link")).toHaveCount(1);
  await expect(grid).toContainText("Charizard ex");
  await page.getByRole("button", { name: "Clear filters ×" }).click();
  await expect(grid.getByRole("link")).toHaveCount(2);

  await page.getByRole("button", { name: "binder", exact: true }).click();
  const binder = page.getByTestId("binder");
  await expect(binder.getByText("Page 1 of 1")).toBeVisible();
  await expect(binder.getByRole("link")).toHaveCount(2);
  // The chosen view is remembered on this device.
  await page.reload();
  await expect(page.getByTestId("binder")).toBeVisible();
});

test("Browse by Pokémon shows every card of a Pokémon and what you own", async ({ page }, info) => {
  await signUpWithCards(page, `dex-${info.project.name}`);
  await page.goto("/cards/fxa-125?finish=holofoil&lang=en&grading=raw&condition=NM");
  await page.getByRole("link", { name: "All Charizard cards →" }).click();
  await expect(page).toHaveURL(/\/pokemon\/Charizard$/);
  await expect(page.getByRole("heading", { name: "Charizard" })).toBeVisible();
  await expect(page.getByText(/3 cards · you own 1/)).toBeVisible();
  await expect(page.getByTestId("species-grid").getByRole("link")).toHaveCount(3);
  await page.getByRole("button", { name: "owned", exact: true }).click();
  await expect(page.getByTestId("species-grid").getByRole("link")).toHaveCount(1);

  await page.goto("/pokemon");
  await expect(page.getByRole("link", { name: /Pikachu/ })).toBeVisible();
  await page.getByLabel("Pokémon name").fill("Mew");
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Mew" })).toBeVisible();
});

test("accent colour can be changed and is remembered", async ({ page }) => {
  await page.goto("/more");
  await page.getByText("Blue", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  await page.goto("/more");
  await page.getByText("Yellow", { exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-accent", /.+/);
});

test("legal pages are linked, old Pokédex links redirect, eBay endpoint refuses until configured", async ({ page, request }) => {
  await page.goto("/pokedex/Charizard");
  await expect(page).toHaveURL(/\/pokemon\/Charizard$/);
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Draft");
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of use" })).toBeVisible();
  expect((await request.get("/api/ebay/account-deletion?challenge_code=x")).status()).toBe(503);
});
