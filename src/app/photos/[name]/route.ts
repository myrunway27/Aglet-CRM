import { publicPhotoUrl, readLocalPhoto } from "@/lib/storage";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Filenames are generated hex + a known extension; anything else is rejected,
  // which also rules out path traversal.
  const m = /^[a-f0-9]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });

  // Production: the bucket serves the bytes; we only hand out the address.
  // Photo names are random and immutable, so browsers may cache the redirect
  // for as long as they like.
  const remote = publicPhotoUrl(name);
  if (remote) {
    return Response.redirect(remote, 301);
  }

  try {
    const data = await readLocalPhoto(name);
    return new Response(new Blob([data as BlobPart], { type: TYPES[m[1]] }), {
      headers: {
        "Content-Type": TYPES[m[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
