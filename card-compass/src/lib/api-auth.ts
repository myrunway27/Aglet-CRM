import "server-only";
import { db } from "./db";
import { ValidationError } from "./errors";

export function requireDb() {
  const client = db();
  if (!client) throw new ValidationError("This feature needs a database (DATABASE_URL).");
  return client;
}
