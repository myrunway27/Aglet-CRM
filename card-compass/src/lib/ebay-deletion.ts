import { createHash } from "node:crypto";

/**
 * eBay Marketplace Account Deletion challenge: SHA-256 (hex) of
 * challengeCode + verificationToken + endpoint, in that order.
 * The endpoint must be the exact URL registered in the eBay developer portal.
 */
export function challengeResponse(challengeCode: string, verificationToken: string, endpoint: string): string {
  return createHash("sha256").update(challengeCode).update(verificationToken).update(endpoint).digest("hex");
}

/** eBay accepts tokens of 32–80 characters: letters, digits, underscore and hyphen. */
export const validVerificationToken = (t: string) => /^[A-Za-z0-9_-]{32,80}$/.test(t);
