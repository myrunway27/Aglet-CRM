import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.CATALOG_PROVIDER = "mock";
  process.env.OCR_PROVIDER = "mock";
  process.env.UPLOAD_MAX_BYTES = "200000";
  delete process.env.DATABASE_URL;
});

function upload(buf: Buffer | Uint8Array, type = "image/png", name = "card.png") {
  const form = new FormData();
  form.append("image", new File([new Uint8Array(buf)], name, { type }));
  return new NextRequest("http://localhost/api/scan", { method: "POST", body: form });
}

const fixture = (f: string) => readFileSync(path.resolve("fixtures/scans", f));

describe("POST /api/scan", () => {
  it("returns OCR fields and ranked candidates without prices", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(upload(fixture("pikachu-dsa.png")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageRetained).toBe(false);
    expect(body.ocr.parsed).toMatchObject({ name: "Pikachu", number: "025/198" });
    expect(body.match.candidates[0].card.catalogId).toBe("mock:demo-a-25");
    expect(body.match.candidates[0].card.prices).toBeUndefined();
    expect(body.match.candidates.length).toBeLessThanOrEqual(5);
  });

  it("ambiguous scan returns multiple printings and says so", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const body = await (await POST(upload(fixture("pikachu-no-setcode.png")))).json();
    expect(body.match.ambiguous).toBe(true);
    expect(body.match.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it("multilingual scan hints the language", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const body = await (await POST(upload(fixture("pikachu-japanese.png")))).json();
    expect(body.ocr.parsed.languageHint).toBe("Japanese");
  });

  it("no match returns an empty list and guidance", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const body = await (await POST(upload(fixture("blank-back.png")))).json();
    expect(body.match.candidates).toEqual([]);
    expect(body.match.message).toMatch(/search by name/);
  });

  it("rejects unsupported and oversized uploads", async () => {
    const { POST } = await import("@/app/api/scan/route");
    expect((await POST(upload(Buffer.from("GIF89a...."), "image/gif", "a.gif"))).status).toBe(415);
    expect((await POST(upload(Buffer.from("not an image"), "image/png"))).status).toBe(415);
    expect((await POST(upload(Buffer.alloc(300_000, 1)))).status).toBe(413);
  });

  it("rejects a request without the image field", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const req = new NextRequest("http://localhost/api/scan", { method: "POST", body: new FormData() });
    expect((await POST(req)).status).toBe(400);
  });
});

describe("GET /api/cards/search", () => {
  it("works without OCR and validates input", async () => {
    const { GET } = await import("@/app/api/cards/search/route");
    const ok = await GET(new NextRequest("http://localhost/api/cards/search?q=charizard"));
    expect((await ok.json()).results.map((c: { name: string }) => c.name)).toContain("Charizard ex");
    expect((await GET(new NextRequest("http://localhost/api/cards/search?q=a"))).status).toBe(400);
  });
});

describe("GET /api/cards/[id]/prices", () => {
  const call = async (id: string, qs: string) => {
    const { GET } = await import("@/app/api/cards/[id]/prices/route");
    return GET(new NextRequest(`http://localhost/api/cards/${encodeURIComponent(id)}/prices?${qs}`), {
      params: Promise.resolve({ id: encodeURIComponent(id) }),
    });
  };

  it("returns source-tagged references, labeled demo, with live offers disabled", async () => {
    const res = await call("mock:demo-a-25", "finish=reverseHolofoil&language=English&grading=raw&condition=Near%20Mint");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.origin).toBe("demo");
    expect(body.liveOffers.enabled).toBe(false);
    const tcg = body.view.blocks.find((b: { source: string }) => b.source === "tcgplayer");
    expect(tcg.currency).toBe("USD");
    expect(tcg.rows.every((r: { finish: string; demo: boolean }) => r.finish === "reverseHolofoil" && r.demo)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/cheapest/i);
  });

  it("validates id and selection", async () => {
    expect((await call("https://evil.test", "finish=normal")).status).toBe(400);
    expect((await call("mock:demo-a-25", "finish=sparkly")).status).toBe(400);
    expect((await call("mock:does-not-exist", "finish=normal")).status).toBe(404);
  });
});
