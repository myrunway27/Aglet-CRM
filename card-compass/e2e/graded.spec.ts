import { expect, test } from "@playwright/test";

test("PSA cert lookup adds a graded slab, valued at its grade with PriceCharting", async ({ page }, info) => {
  await page.goto("/login?next=/graded");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(`graded-${info.project.name}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Add a graded card" })).toBeVisible();

  // Slab without a numeric grade can't be valued by grade.
  await page.getByLabel("PSA cert number").fill("90000004");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText(/has no numeric grade \(AUTHENTIC\)/)).toBeVisible();

  await page.getByLabel("PSA cert number").fill("9000 0001");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("GEM MT 10")).toBeVisible();
  await expect(page.getByText(/PSA population: 812 at this grade/)).toBeVisible();
  const first = page.getByRole("radio", { name: /Charizard ex.*Fixture Set Alpha/ });
  await expect(page.getByRole("radio", { name: /Charizard ex/ }).first()).not.toBeChecked();
  await first.check();
  await page.getByLabel(/^Finish/).selectOption("holofoil");
  await page.getByLabel(/Paid \(USD/).fill("100.00");
  await page.getByRole("button", { name: "Add PSA 10 to collection" }).click();
  await expect(page.getByText(/Added PSA 10 Charizard ex \(cert 90000001\)/)).toBeVisible();

  // Same cert again is refused.
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("This cert is already in your collection.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add PSA 10 to collection" })).toHaveCount(0);

  await page.goto("/collection");
  await expect(page.getByText("Value on PriceCharting basis")).toBeVisible();
  await page.getByRole("button", { name: "list", exact: true }).click();
  await expect(page.getByText(/PriceCharting:\s*USD\s138\.00/)).toBeVisible();
  await expect(page.getByText(/vs PriceCharting\s*\+USD\s38\.00 \(\+38\.0%\)/)).toBeVisible();

  // Results page highlights the PSA 10 row in the sales-based panel.
  await page.goto("/cards/fxa-125?finish=holofoil&lang=en&grading=graded&grader=PSA&grade=10");
  await expect(page.getByTestId("quick-pricecharting")).toContainText(/PSA 10/);
  await expect(page.getByTestId("quick-pricecharting")).toContainText(/USD\s138\.00/);
  await page.getByText("All price details and sources").click();
  const pc = page.getByTestId("source-pricecharting");
  await expect(pc).toContainText("based on completed sales");
  await expect(pc.getByRole("row", { name: /PSA 10\s*· your card/ })).toContainText(/USD\s138\.00/);
});
