import { execSync } from "node:child_process";

/** Seed demo cards + 90 days of demo price history (idempotent). */
export default function globalSetup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}
