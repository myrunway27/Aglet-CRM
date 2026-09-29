import { env } from "@/lib/env";
import { challengeResponse, validVerificationToken } from "@/lib/ebay-deletion";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function endpoint(): string {
  const e = env();
  return (
    e.EBAY_DELETION_ENDPOINT ??
    `${e.APP_URL.replace(/\/$/, "")}/api/ebay/account-deletion`
  );
}

/** eBay's endpoint check: echo the hashed challenge. */
export async function GET(req: Request) {
  const token = env().EBAY_VERIFICATION_TOKEN;
  const code = new URL(req.url).searchParams.get("challenge_code");
  if (!token || !validVerificationToken(token))
    return Response.json(
      {
        error: {
          code: "not_configured",
          message: "Account-deletion endpoint is not configured.",
        },
      },
      { status: 503 },
    );
  if (!code || code.length > 256)
    return Response.json(
      { error: { code: "bad_request", message: "Missing challenge_code." } },
      { status: 400 },
    );
  return Response.json({
    challengeResponse: challengeResponse(code, token, endpoint()),
  });
}

/**
 * Deletion notices. Card Compass uses eBay's application token only for public
 * search and never stores eBay user data, so there is nothing to delete: we
 * acknowledge the notice and keep no copy of it.
 */
export async function POST(req: Request) {
  if (!env().EBAY_VERIFICATION_TOKEN)
    return new Response(null, { status: 503 });
  const body = (await req.json().catch(() => null)) as {
    metadata?: { topic?: string };
  } | null;
  log.info("ebay.account_deletion", {
    topic: body?.metadata?.topic ?? "unknown",
  });
  return new Response(null, { status: 204 });
}
