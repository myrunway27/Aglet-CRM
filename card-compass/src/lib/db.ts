import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const g = globalThis as unknown as { prisma?: PrismaClient };

/** Returns null when DATABASE_URL is not configured (persistence disabled). */
export function db(): PrismaClient | null {
  if (!env().DATABASE_URL) return null;
  g.prisma ??= new PrismaClient({ log: ["error"] });
  return g.prisma;
}
