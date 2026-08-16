import path from "node:path";

/**
 * Where review photos are stored on disk. Defaults to public/uploads for
 * local development; in production set UPLOAD_DIR to a persistent volume
 * (e.g. /data/uploads). Photos are served through /photos/[name].
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
