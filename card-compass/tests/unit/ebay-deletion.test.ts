import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { challengeResponse, validVerificationToken } from "@/lib/ebay-deletion";

describe("eBay account-deletion challenge", () => {
  it("hashes challenge code + token + endpoint in that order", () => {
    const token = "a".repeat(40);
    const url = "https://example.com/api/ebay/account-deletion";
    const want = createHash("sha256").update(`abc123${token}${url}`).digest("hex");
    expect(challengeResponse("abc123", token, url)).toBe(want);
    expect(challengeResponse("abc123", token, url + "/")).not.toBe(want);
  });

  it("accepts only tokens eBay allows", () => {
    expect(validVerificationToken("short")).toBe(false);
    expect(validVerificationToken("x".repeat(32))).toBe(true);
    expect(validVerificationToken("bad token with spaces and enough length!!")).toBe(false);
  });
});
