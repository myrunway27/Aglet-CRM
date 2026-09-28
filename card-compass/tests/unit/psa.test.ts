import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import { finishHint, LivePsaProvider, MockPsaProvider, parsePsaGrade, subjectToName } from "@/lib/psa/cert";

describe("PSA cert parsing", () => {
  it.each([
    ["GEM MT 10", "10"],
    ["MINT 9", "9"],
    ["NM-MT 8.5", "8.5"],
    ["AUTHENTIC", null],
    ["", null],
    [null, null],
  ])("grade %s -> %s", (label, grade) => expect(parsePsaGrade(label)).toBe(grade));

  it("turns PSA subjects into card names and finish hints", () => {
    expect(subjectToName("PIKACHU-HOLO")).toBe("Pikachu");
    expect(subjectToName("CHARIZARD ex")).toBe("Charizard ex");
    expect(subjectToName("MEWTWO VSTAR")).toBe("Mewtwo VSTAR");
    expect(finishHint({ subject: "PIKACHU", variety: "REVERSE HOLO" })).toBe("reverseHolofoil");
    expect(finishHint({ subject: "PIKACHU-HOLO", variety: "" })).toBe("holofoil");
    expect(finishHint({ subject: "PIKACHU", variety: null })).toBeNull();
  });

  it("mock provider returns demo records and 404s unknown certs", async () => {
    const p = new MockPsaProvider();
    expect(await p.lookup("90000001")).toMatchObject({ grade: "10", subject: "CHARIZARD ex", population: 812, isDemo: true });
    await expect(p.lookup("12345678")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("live provider sends the bearer token and maps the record", async () => {
    const f = vi.fn(async () =>
      Response.json({ PSACert: { CertNumber: "123456789", Year: "1999", Brand: "POKEMON GAME", Subject: "CHARIZARD-HOLO", CardNumber: "4", CardGrade: "NM-MT 8", TotalPopulation: 5000 } }),
    );
    const p = new LivePsaProvider("tok", 100, f as unknown as typeof fetch);
    const c = await p.lookup("123456789");
    expect(c).toMatchObject({ certNumber: "123456789", grade: "8", isDemo: false });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.psacard.com/publicapi/cert/GetByCertNumber/123456789");
    expect((init.headers as Record<string, string>).Authorization).toBe("bearer tok");
    await expect(p.lookup("abc")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("live provider treats an empty record as not found", async () => {
    const f = vi.fn(async () => Response.json({ IsValidRequest: true, ServerMessage: "No data found" }));
    await expect(new LivePsaProvider("tok", 100, f as unknown as typeof fetch).lookup("123456789")).rejects.toBeInstanceOf(NotFoundError);
  });
});
