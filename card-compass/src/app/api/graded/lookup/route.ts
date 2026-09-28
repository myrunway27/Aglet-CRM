import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { ValidationError } from "@/lib/errors";
import { findCandidates } from "@/lib/matching/match";
import { normalizeName, similarity } from "@/lib/matching/normalize";
import { getPsa, lookupCert } from "@/lib/psa";
import { CERT_RE, finishHint, subjectToName } from "@/lib/psa/cert";
import { KeyedLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
const limiter = new KeyedLimiter(10);

/**
 * Look up a PSA cert and suggest matching catalog printings. Never adds
 * anything: the buyer confirms the printing and finish on the next step.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    if (!getPsa()) {
      return Response.json({ error: { code: "psa_disabled", message: "PSA cert lookup isn't enabled on this server." } }, { status: 503 });
    }
    limiter.check(user.id);
    const body = z.object({ cert: z.string().trim() }).safeParse(await req.json().catch(() => null));
    if (!body.success || !CERT_RE.test(body.data.cert)) throw new ValidationError("Enter the digits of the PSA cert number.");
    const cert = await lookupCert(body.data.cert);
    const already = await requireDb().collectionItem.findFirst({
      where: { userId: user.id, grader: "PSA", certNumber: cert.certNumber },
      select: { id: true },
    });

    const name = subjectToName(cert.subject);
    const number = cert.cardNumber ? cert.cardNumber.replace(/^0+(?=\d)/, "") : null;
    const match = await findCandidates({ name, number, setTotal: null, rawNumber: cert.cardNumber, hp: null, notes: [] }, getCatalog());
    // Boost candidates whose set name appears on the PSA label (e.g. "POKEMON SV01-SCARLET & VIOLET").
    const brand = normalizeName(cert.brand ?? "");
    const candidates = match.candidates
      .map((c) => {
        const set = normalizeName(c.card.setName);
        const onLabel = brand.includes(set) || similarity(brand.replace(/^pokemon\s+/, ""), set) >= 0.8;
        return onLabel ? { ...c, score: c.score + 20, reasons: [...c.reasons, "Set matches the PSA label"] } : c;
      })
      .sort((a, b) => b.score - a.score);

    return Response.json({ cert, alreadyOwned: Boolean(already), finishHint: finishHint(cert), parsedName: name, candidates });
  } catch (err) {
    return errorResponse(err, "graded.lookup");
  }
}
