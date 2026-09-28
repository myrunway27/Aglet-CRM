import { NextResponse, type NextRequest } from "next/server";
import { catalog } from "@/lib/catalog";
import { parseClues } from "@/lib/match/parse";
import { rankCandidates } from "@/lib/match/score";
import { ocr } from "@/lib/ocr";
import { handleRouteError, jsonError, toSummary } from "@/lib/server/api";
import { env } from "@/lib/server/env";
import { checkUpload, sanitizeImage, sha256 } from "@/lib/server/image";
import { errInfo, log } from "@/lib/server/log";
import { recordScan } from "@/lib/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const max = env().UPLOAD_MAX_BYTES;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > max + 64_000) return jsonError(413, "too_large", "Image is too large. Try a smaller photo.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "bad_request", "Send the photo as multipart form field “image”.");
  }
  const file = form.get("image");
  if (!(file instanceof File)) return jsonError(400, "bad_request", "Send the photo as multipart form field “image”.");

  let original: Uint8Array | null = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(original, file.type, max);
  if (!check.ok) {
    return jsonError(check.code === "too_large" ? 413 : check.code === "empty" ? 400 : 415, check.code, check.message);
  }

  let clean: Buffer | null;
  const originalSha = sha256(original);
  try {
    clean = await sanitizeImage(original);
  } catch (err) {
    log("warn", "scan.decode_failed", errInfo(err));
    return jsonError(415, "unreadable_image", "That image could not be read. Try another photo.");
  } finally {
    // Drop our reference to the raw upload immediately (it held EXIF/GPS metadata).
    original = null;
  }

  try {
    const provider = ocr();
    let text = "";
    let locale: string | null = null;
    try {
      ({ text, locale } = await provider.extractText({ image: clean, originalSha256: originalSha }));
    } catch (err) {
      log("warn", "scan.ocr_failed", { provider: provider.id, ...errInfo(err) });
      return jsonError(502, "ocr_unavailable", "Text recognition is unavailable. Search for the card by name instead.");
    } finally {
      // Images are processed in memory only and never stored.
      clean = null;
    }

    const clues = parseClues(text);
    const cards = text ? await catalog().findByClues(clues) : [];
    const match = rankCandidates(cards, clues);
    const scanId = await recordScan(clues.name, clues.numberRaw);
    log("info", "scan.done", {
      ocr: provider.id,
      textFound: text.length > 0,
      candidates: match.candidates.length,
      confidence: match.confidence,
    });

    return NextResponse.json({
      scanId,
      imageRetained: false,
      ocr: {
        provider: provider.id,
        textFound: text.trim().length > 0,
        lines: clues.lines.slice(0, 30),
        locale,
        parsed: {
          name: clues.name,
          number: clues.numberRaw,
          setCodes: clues.setCodes,
          languageHint: clues.languageHint,
        },
      },
      match: {
        confidence: match.confidence,
        ambiguous: match.ambiguous,
        message: text ? match.message : "No text was recognized. Try a sharper, glare-free photo or search by name.",
        candidates: match.candidates.map((c) => ({ card: toSummary(c.card), score: c.score, reasons: c.reasons })),
      },
      notice:
        provider.id === "mock"
          ? "Mock OCR is active: only the bundled fixture images are recognized. Configure Google Cloud Vision for real photos."
          : null,
    });
  } catch (err) {
    return handleRouteError("scan", err);
  }
}
