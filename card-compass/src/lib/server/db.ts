import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const g = globalThis as unknown as { __prisma?: PrismaClient };

/** Returns a Prisma client, or null when DATABASE_URL is not configured. */
export function db(): PrismaClient | null {
  if (!env().DATABASE_URL) return null;
  g.__prisma ??= new PrismaClient({ log: ["error"] });
  return g.__prisma;
}
