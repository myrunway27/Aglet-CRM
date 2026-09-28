import { expect, test } from "@playwright/test";

test("share a trade binder read-only, hide private fields, revoke", async ({ page, browser }, info) => {
  const email = `share-${info.project.name}-${Date.now()}@example.com`;
  await page.goto("/login?next=/collection");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My collection" })).toBeVisible();
  await page.getByLabel("New binder name").fill("Trade");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trade", pressed: true })).toBeVisible();

  // One card in the Trade binder (with a purchase price), one PSA slab outside it.
  await page.goto("/cards/fxa-125?finish=holofoil&lang=en&grading=raw&condition=LP");
  const add = page.getByRole("form", { name: "Add to collection" });
  await add.getByLabel(/Paid each/).fill("12.34");
  await add.getByLabel("Binder").selectOption({ label: "Trade" });
  await add.getByRole("button", { name: "Add to collection" }).click();
  await expect(add.getByRole("status")).toBeVisible();
  await page.goto("/graded");
  await page.getByLabel("PSA cert number").fill("90000003");
  await page.getByRole("button", { name: "Look up" }).click();
  await page.getByRole("radio", { name: /Pikachu.*Fixture Set Beta/ }).check();
  await page.getByLabel(/^Finish/).selectOption("holofoil");
  await page.getByRole("button", { name: "Add PSA 10 to collection" }).click();
  await expect(page.getByText(/Added PSA 10 Pikachu/)).toBeVisible();

  // Create a binder share with values, and a whole-collection share without.
  await page.goto("/collection");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("What").selectOption({ label: "Binder: Trade" });
  await page.getByLabel("Title").fill("My trade list");
  await page.getByLabel("Show values").check();
  await page.getByRole("button", { name: "Create link" }).click();
  await page.getByLabel("What").selectOption({ label: "Whole collection" });
  await page.getByLabel("Show values").uncheck();
  await page.getByRole("button", { name: "Create link" }).click();
  const links = page.getByRole("list", { name: "Your share links" }).getByRole("listitem");
  await expect(links).toHaveCount(2);
  const tradeUrl = await page.getByLabel("Link for My trade list").inputValue();
  const allUrl = await page.getByLabel("Link for My collection").inputValue();
  expect(tradeUrl).toMatch(/\/u\/[A-Za-z0-9_-]{22}$/);

  const anon = await browser.newContext();
  const v = await anon.newPage();
  await v.goto(new URL(tradeUrl).pathname);
  await expect(v.getByRole("heading", { name: "My trade list" })).toBeVisible();
  await expect(v.getByText("Charizard ex")).toBeVisible();
  await expect(v.getByText(/Lightly Played/)).toBeVisible();
  await expect(v.getByText(/TCGplayer:\s*USD\s22\.50/)).toBeVisible();
  await expect(v.getByText("Pikachu")).toHaveCount(0); // not in this binder
  const html = await v.content();
  expect(html).not.toContain(email);
  expect(html).not.toContain("12.34");
  expect(html).not.toContain("90000003");
  expect(await v.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");

  await v.goto(new URL(allUrl).pathname);
  await expect(v.getByText("PSA 10")).toBeVisible();
  await expect(v.getByText(/USD\s/)).toHaveCount(0); // values off
  expect(await v.content()).not.toContain("90000003");

  // Revoke -> 404 immediately (even though the view is cached).
  await page.getByRole("button", { name: "Revoke My trade list" }).click();
  await expect(links).toHaveCount(1);
  const res = await v.goto(new URL(tradeUrl).pathname);
  expect(res?.status()).toBe(404);
  await anon.close();
});
