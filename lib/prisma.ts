import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const canReuseClient = Boolean(globalForPrisma.prisma);

export const prisma =
  (canReuseClient ? globalForPrisma.prisma : null) ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
