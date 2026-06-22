import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value || !value.includes("pooler.supabase.com")) return value;

  const url = new URL(value);
  if (!url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }
  return url.toString();
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
