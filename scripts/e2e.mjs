import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const base = "http://localhost:3100";
const chromiumDir = readdirSync("/opt/pw-browsers").find((d) => /^chromium-\d+$/.test(d));
const executablePath = `/opt/pw-browsers/${chromiumDir}/chrome-linux/chrome`;

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const email = `e2e-${Date.now()}@test.local`;
const results = [];
const check = (name, ok) => { results.push(`${ok ? "PASS" : "FAIL"} ${name}`); };

try {
  // 1. Signup
  await page.goto(`${base}/signup`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click("button:has-text('Sign up')");
  await page.waitForURL(`${base}/`);
  check("signup + redirect home", true);
  check("nav shows Log out", await page.isVisible("button:has-text('Log out')"));

  // 2. Post a 1-star review as a brand-new account -> should publish AND flag
  await page.goto(`${base}/business/rapid-fix-auto-demo`);
  await page.click("button[aria-label='1 star']");
  await page.fill('textarea[name="text"]', "Absolutely terrible service, they scratched my car and denied everything when I complained.");
  await page.click("button:has-text('Post anonymous review')");
  await page.waitForURL(/posted=1/);
  await page.waitForSelector("text=Your anonymous review is live");
  check("review posted", true);
  check("new-account 1-star flagged", await page.isVisible("text=flagged it for a quick human check"));

  // 3. Review appears with pseudonym, not email
  await page.reload();
  const bodyText = await page.textContent("body");
  check("review text visible", bodyText.includes("scratched my car"));
  check("email NOT visible on page", !bodyText.includes(email));
  check("one-review-per-business enforced", bodyText.includes("You've reviewed this business"));

  // 4. Helpful vote toggle
  await page.click("button:has-text('👍 Helpful')");
  await page.waitForSelector("text=Helpful · 1");
  check("helpful vote", true);

  // 5. Claim flow
  await page.goto(`${base}/business/glow-day-spa-demo/claim`);
  await page.fill('textarea[name="evidence"]', "You can verify me at owner@glowdayspa.example or call +972-555-0100.");
  await page.click("button:has-text('Submit claim')");
  await page.waitForSelector("text=Claim submitted");
  check("owner claim submitted", true);

  // 6. Admin: see flagged review + claim, approve claim, keep review
  await page.click("button:has-text('Log out')");
  await page.goto(`${base}/login`);
  await page.fill('input[name="email"]', "admin@truereview.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click("button:has-text('Log in')");
  await page.waitForURL(`${base}/`);
  await page.goto(`${base}/admin`);
  const adminText = await page.textContent("body");
  check("admin sees flagged review", adminText.includes("account less than 24 hours old"));
  check("admin sees pending claim", adminText.includes("glowdayspa.example"));
  await page.click("button:has-text('Approve')");
  await page.waitForLoadState("networkidle");
  check("claim approved", !(await page.textContent("body")).includes("glowdayspa.example"));

  // 7. Owner reply: log back in as e2e user, reply on owned business
  await page.click("button:has-text('Log out')");
  await page.goto(`${base}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click("button:has-text('Log in')");
  await page.waitForURL(`${base}/`);
  await page.goto(`${base}/owner`);
  const ownerText = await page.textContent("body");
  check("owner dashboard shows business", ownerText.includes("Glow Day Spa"));
  await page.click("summary:has-text('Reply as owner')");
  await page.fill('textarea[name="text"]', "Thank you so much! Hope to see you again soon.");
  await page.click("button:has-text('Post reply')");
  await page.waitForSelector("text=✓ Reply posted.");
  await page.goto(`${base}/business/glow-day-spa-demo`);
  const bizText = await page.textContent("body");
  check("owner reply visible with badge", bizText.includes("Response from the owner") && bizText.includes("Hope to see you again"));
  check("owner verified badge shown", bizText.includes("Owner verified"));

  // 8. Report a review
  await page.click("summary:has-text('Report this review')");
  await page.fill('textarea[name="reason"]', "This looks like it was written by a competitor.");
  await page.click("button:has-text('Send report')");
  await page.waitForSelector("text=Reported. A moderator will take a look.");
  check("report submitted", true);
} catch (err) {
  results.push(`ERROR: ${err.message.split("\n")[0]}`);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-Aglet-CRM/c58eca02-ecaa-513e-91ed-5e0fb27b6abb/scratchpad/fail.png" });
}

console.log(results.join("\n"));
await browser.close();
