import path from "node:path";
import { test } from "@playwright/test";

const out = (name: string) => path.resolve(__dirname, "../docs/screenshots", name);
const fixture = path.resolve(__dirname, "../fixtures/scans/pikachu-no-setcode.png");

for (const vp of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
]) {
  test(`screenshots @ ${vp.name} ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await page.screenshot({ path: out(`${vp.name}-1-home.png`), fullPage: true });

    await page.getByTestId("scan-input").setInputFiles(fixture);
    await page.getByTestId("candidates").waitFor();
    await page.screenshot({ path: out(`${vp.name}-2-candidates.png`), fullPage: true });

    await page.getByRole("button", { name: "Select Pikachu, Demo Set Alpha number 25" }).click();
    await page.getByLabel("Normal (non-holo)").check();
    await page.getByLabel(/I checked that the set symbol/).check();
    await page.screenshot({ path: out(`${vp.name}-3-confirm.png`), fullPage: true });

    await page.getByRole("button", { name: "Confirm and view references" }).click();
    await page.getByRole("heading", { name: "Market references" }).waitFor();
    await page.screenshot({ path: out(`${vp.name}-4-results.png`), fullPage: true });
  });
}
