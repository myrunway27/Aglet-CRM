import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const OUTBOX = path.join(__dirname, "..", ".outbox");

/** Latest outbox email to `to` whose subject matches, as its link path. */
async function linkFrom(to: string, subject: RegExp): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const files = (await readdir(OUTBOX).catch(() => [])).sort().reverse();
    for (const f of files) {
      const m = JSON.parse(await readFile(path.join(OUTBOX, f), "utf8"));
      if (m.to === to && subject.test(m.subject)) return new URL(/https?:\/\/\S+/.exec(m.text)![0]).pathname + new URL(/https?:\/\/\S+/.exec(m.text)![0]).search;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("email not found");
}

test("email confirmation, forgot password, reset, and old sessions signed out", async ({ page, browser }, info) => {
  const email = `mail-${info.project.name}-${Date.now()}@example.com`;
  await page.goto("/login");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("first-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My collection" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByText("Email not confirmed")).toBeVisible();
  await expect(page.getByLabel(/Email me when a price alert fires/)).toBeDisabled();

  // Confirm via emailed link (POST on button click, not on page load)
  const verifyLink = await linkFrom(email, /Confirm your/);
  await page.goto(verifyLink);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Thanks, your email is confirmed.")).toBeVisible();
  await page.goto("/account");
  await expect(page.getByText("Email confirmed")).toBeVisible();
  await page.getByLabel(/Email me when a price alert fires/).check();
  await expect(page.getByText("Price alerts will also be emailed to you.")).toBeVisible();

  // A second browser context stays signed in with the old password...
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/login");
  await otherPage.getByLabel("Email").fill(email);
  await otherPage.getByLabel("Password").fill("first-password-123");
  await otherPage.getByRole("button", { name: "Sign in" }).click();
  await expect(otherPage.getByRole("heading", { name: "My collection" })).toBeVisible();

  // ...then a reset from the forgot-password flow signs it out.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto("/login");
  await anonPage.getByRole("link", { name: "Forgot your password?" }).click();
  await anonPage.getByLabel("Email").fill(email);
  await anonPage.getByRole("button", { name: "Send reset link" }).click();
  await expect(anonPage.getByText(/If an account exists/)).toBeVisible();
  const resetLink = await linkFrom(email, /Reset your/);
  await anonPage.goto(resetLink);
  await anonPage.getByRole("textbox", { name: /^New password/ }).fill("second-password-456");
  await anonPage.getByRole("button", { name: "Set password" }).click();
  await expect(anonPage.getByRole("heading", { name: "My collection" })).toBeVisible();

  await otherPage.goto("/collection");
  await expect(otherPage).toHaveURL(/\/login/);

  // The reset link is single-use.
  await anonPage.goto(resetLink);
  await anonPage.getByRole("textbox", { name: /^New password/ }).fill("third-password-789");
  await anonPage.getByRole("button", { name: "Set password" }).click();
  await expect(anonPage.getByRole("alert").filter({ hasText: "invalid or has expired" })).toBeVisible();

  // Unknown emails get the same answer (no account enumeration).
  const r = await anonPage.request.post("/api/auth/forgot", {
    headers: { Origin: new URL(anonPage.url()).origin },
    data: { email: `nobody-${Date.now()}@example.com` },
  });
  expect(await r.json()).toEqual({ ok: true });
  await other.close();
  await anon.close();
});
