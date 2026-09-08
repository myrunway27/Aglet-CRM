import "server-only";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Where review photos live.
//
// Production: Supabase Storage, a public-read bucket named "photos". The app
// keeps only the file name; ReviewPhoto.path stays "/photos/<name>" so the
// URL people see never changes, and /photos/[name] redirects to the bucket.
//
// Local development and tests: the filesystem, exactly as before, so nothing
// needs cloud credentials to run.

const BUCKET = "photos";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

export type StorageMode = "supabase" | "local";

export function storageMode(): StorageMode {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? "supabase" : "local";
}

function supabaseBase(): string {
  return (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SECRET_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Store a photo under `name`. Throws if the store refuses it. */
export async function savePhoto(name: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (storageMode() === "local") {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), bytes);
    return;
  }
  const res = await fetch(`${supabaseBase()}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": contentType, "x-upsert": "false" },
    body: new Blob([bytes as BlobPart], { type: contentType }),
  });
  if (!res.ok) {
    throw new Error(`photo upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

/**
 * Public URL for a stored photo, or null when photos are served from disk
 * (the caller then reads the file itself).
 */
export function publicPhotoUrl(name: string): string | null {
  if (storageMode() === "local") return null;
  return `${supabaseBase()}/storage/v1/object/public/${BUCKET}/${name}`;
}

/** Read a locally-stored photo. Only meaningful in local mode. */
export async function readLocalPhoto(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(UPLOAD_DIR, name)));
}
