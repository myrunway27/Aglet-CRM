import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// The embeddable rating badge. Served as SVG so it's crisp everywhere and
// always shows the live score — social proof on the business's own site,
// which links back to the full review page here.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, scoreAvg: true, scoreCount: true },
  });
  if (!business) return new NextResponse("Not found", { status: 404 });

  const rated = business.scoreCount > 0;
  const score = rated ? business.scoreAvg.toFixed(1) : "–";
  const label = rated
    ? `${business.scoreCount} anonymous review${business.scoreCount === 1 ? "" : "s"}`
    : "No reviews yet";
  const stars = rated ? Math.round(business.scoreAvg) : 0;
  const starRow = [1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<text x="${86 + (i - 1) * 17}" y="40" font-size="16" fill="${
          i <= stars ? "#F5A524" : "#D6D3D1"
        }">★</text>`
    )
    .join("");
  const name = business.name.length > 22 ? business.name.slice(0, 21) + "…" : business.name;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="76" role="img" aria-label="${score} out of 5 on True Review">
  <rect width="240" height="76" rx="10" fill="#FFFFFF" stroke="#E7E5E4"/>
  <rect x="12" y="14" width="48" height="48" rx="11" fill="#1A1917"/>
  <path d="M22,26 h28 v6.9 h-10.6 v21.1 h-6.8 V32.9 H22 Z" fill="#FFFFFF"/>
  <text x="86" y="24" font-family="Helvetica,Arial,sans-serif" font-size="12" font-weight="700" fill="#1A1917">${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  ${starRow}
  <text x="172" y="40" font-family="Helvetica,Arial,sans-serif" font-size="15" font-weight="700" fill="#1A1917">${score}</text>
  <text x="86" y="60" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#78716C">${label} · truereview.me</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // Live-ish: refreshes within an hour wherever it's embedded
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
