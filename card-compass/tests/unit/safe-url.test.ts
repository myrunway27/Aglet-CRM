import { describe, expect, it } from "vitest";
import { safeImageUrl, safeSourceUrl } from "@/lib/safe-url";

describe("safeSourceUrl", () => {
  it.each([
    "https://prices.pokemontcg.io/tcgplayer/xy1-1",
    "https://www.tcgplayer.com/product/1",
    "https://www.cardmarket.com/en/Pokemon/Products/Singles/x",
  ])("allows %s", (u) => expect(safeSourceUrl(u)).toBe(u));

  it.each([
    "javascript:alert(1)",
    "http://prices.pokemontcg.io/x",
    "https://evil.test/redirect?to=https://tcgplayer.com",
    "https://prices.pokemontcg.io.evil.test/x",
    "https://user:pw@www.tcgplayer.com/",
    "https://www.tcgplayer.com:8443/",
    "//www.tcgplayer.com/x",
    42,
    null,
  ])("rejects %s", (u) => expect(safeSourceUrl(u)).toBeNull());
});

describe("safeImageUrl", () => {
  it("only allows the catalog image host over https", () => {
    expect(safeImageUrl("https://images.pokemontcg.io/a/1.png")).not.toBeNull();
    expect(safeImageUrl("http://images.pokemontcg.io/a/1.png")).toBeNull();
    expect(safeImageUrl("https://evil.test/1.png")).toBeNull();
  });
});
