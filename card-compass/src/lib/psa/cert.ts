import fixture from "../../../fixtures/psa/certs.json";
import { NotFoundError, UpstreamError } from "../errors";
import { fetchJsonWithRetry, type FetchLike } from "../http";
import { OutboundLimiter } from "../rate-limit";

/** Normalized PSA certificate record. */
export interface PsaCert {
  certNumber: string;
  year: string | null;
  brand: string | null;
  subject: string;
  cardNumber: string | null;
  variety: string | null;
  gradeLabel: string | null;
  /** Numeric grade ("10", "8.5") or null for AUTHENTIC / altered / unparseable. */
  grade: string | null;
  population: number | null;
  populationHigher: number | null;
  isDemo: boolean;
}

export const CERT_RE = /^\d{6,12}$/;

/** "GEM MT 10" -> "10", "NM-MT 8.5" -> "8.5", "AUTHENTIC" -> null */
export function parsePsaGrade(label: string | null | undefined): string | null {
  const m = /(\d{1,2}(?:\.5)?)\s*$/.exec((label ?? "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 10 ? m[1] : null;
}

/** "PIKACHU-HOLO" -> "Pikachu", "CHARIZARD ex" -> "Charizard ex" (card-name casing; variety tags removed). */
export function subjectToName(subject: string): string {
  const base = subject.replace(/-(HOLO|REV\.?\s*HOLO|REVERSE\s*HOLO|1ST\s*EDITION|FULL ART|SECRET)\b.*$/i, "").trim();
  return base
    .split(/\s+/)
    .map((w) => (/^(ex|gx|v|vmax|vstar)$/i.test(w) ? (w.toLowerCase() === "ex" ? "ex" : w.toUpperCase()) : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/** Finish suggested by the label (the buyer still confirms). */
export function finishHint(c: Pick<PsaCert, "subject" | "variety">): string | null {
  const t = `${c.subject} ${c.variety ?? ""}`.toUpperCase();
  if (/REV(\.|ERSE)?\s*HOLO/.test(t)) return "reverseHolofoil";
  if (/1ST\s*EDITION/.test(t)) return "1stEditionHolofoil";
  if (/HOLO/.test(t)) return "holofoil";
  return null;
}

type RawCert = Record<string, string | number | boolean | null | undefined>;
const str = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));

export function mapCert(r: RawCert, isDemo: boolean): PsaCert {
  const gradeLabel = str(r.CardGrade) ?? str(r.GradeDescription);
  return {
    certNumber: String(r.CertNumber),
    year: str(r.Year),
    brand: str(r.Brand),
    subject: String(r.Subject ?? ""),
    cardNumber: str(r.CardNumber),
    variety: str(r.Variety),
    gradeLabel,
    grade: parsePsaGrade(gradeLabel),
    population: typeof r.TotalPopulation === "number" ? r.TotalPopulation : null,
    populationHigher: typeof r.PopulationHigher === "number" ? r.PopulationHigher : null,
    isDemo,
  };
}

export interface PsaProvider {
  readonly id: "mock" | "live";
  lookup(cert: string): Promise<PsaCert>;
}

export class MockPsaProvider implements PsaProvider {
  readonly id = "mock" as const;
  async lookup(cert: string): Promise<PsaCert> {
    const r = (fixture as { certs: Record<string, RawCert> }).certs[cert];
    if (!r) throw new NotFoundError("No PSA certificate with that number (demo data has 90000001–90000004)");
    return mapCert(r, true);
  }
}

/** PSA public API (bearer token from psacard.com). Free tiers have a small daily quota. */
export class LivePsaProvider implements PsaProvider {
  readonly id = "live" as const;
  private limiter: OutboundLimiter;
  constructor(
    private readonly token: string,
    perDay: number,
    private readonly fetchImpl?: FetchLike,
  ) {
    this.limiter = new OutboundLimiter(10, perDay);
  }
  async lookup(cert: string): Promise<PsaCert> {
    if (!CERT_RE.test(cert)) throw new NotFoundError("Invalid cert number");
    this.limiter.acquire();
    try {
      const res = await fetchJsonWithRetry<{ PSACert?: RawCert; IsValidRequest?: boolean; ServerMessage?: string }>(
        `https://api.psacard.com/publicapi/cert/GetByCertNumber/${cert}`,
        { headers: { Authorization: `bearer ${this.token}`, Accept: "application/json" } },
        { timeoutMs: 8000, retries: 1, fetchImpl: this.fetchImpl },
      );
      if (!res.PSACert?.CertNumber) throw new NotFoundError("No PSA certificate with that number");
      return mapCert(res.PSACert, false);
    } catch (err) {
      if (err instanceof UpstreamError && err.status === 404) throw new NotFoundError("No PSA certificate with that number");
      throw err;
    }
  }
}
