import { clientKey, errorResponse } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { sanitizeImage } from "@/lib/image";
import { log } from "@/lib/log";
import { findCandidates } from "@/lib/matching/match";
import { parseCardText } from "@/lib/matching/parse";
import { getOcr } from "@/lib/ocr";
import { KeyedLimiter } from "@/lib/rate-limit";
import { recordScan } from "@/lib/repo";

export const runtime = "nodejs";

let limiter: KeyedLimiter | undefined;

export async function POST(req: Request) {
  try {
    const e = env();
    limiter ??= new KeyedLimiter(e.SCAN_LIMIT_PER_MINUTE);
    limiter.check(clientKey(req));

    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > e.MAX_UPLOAD_BYTES + 64_000) {
      throw new ValidationError(`Image is too large (max ${Math.floor(e.MAX_UPLOAD_BYTES / 1_000_000)} MB).`);
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ValidationError("Expected a multipart form upload with an 'image' field.");
    }
    const file = form.get("image");
    if (!(file instanceof File)) throw new ValidationError("Missing 'image' file.");
    if (file.size > e.MAX_UPLOAD_BYTES) {
      throw new ValidationError(`Image is too large (max ${Math.floor(e.MAX_UPLOAD_BYTES / 1_000_000)} MB).`);
    }

    // In-memory only: the photo is never written to disk or the database and
    // goes out of scope when this request ends.
    const image = await sanitizeImage(Buffer.from(await file.arrayBuffer()), file.type, e.MAX_UPLOAD_BYTES);
    const ocr = await getOcr().extractText(image.data, image.mime);
    const parsed = parseCardText(ocr.text);

    const catalog = getCatalog();
    const match =
      parsed.name || parsed.number
        ? await findCandidates(parsed, catalog)
        : { candidates: [], ambiguous: false, duplicatePrintings: false };

    const scanId = await recordScan(parsed.name, parsed.number);
    log.info("scan.completed", {
      ocr: ocr.provider,
      hasName: Boolean(parsed.name),
      hasNumber: Boolean(parsed.number),
      candidates: match.candidates.length,
    });

    return Response.json({
      scanId,
      mode: catalog.id === "mock" ? "mock" : "live",
      ocr: { provider: ocr.provider, text: ocr.text, warnings: ocr.warnings },
      parsed,
      match,
    });
  } catch (err) {
    return errorResponse(err, "scan");
  }
}
