/**
 * Singleton Prisma Client — Neon serverless driver adapter
 *
 * Prisma 7 requiert un Driver Adapter explicite (plus de query engine binaire).
 * On utilise @prisma/adapter-neon + @neondatabase/serverless pour Neon PostgreSQL.
 *
 * - En dev : pool direct via DATABASE_URL
 * - En prod (Vercel) : même pool, Neon gère le pooling via Hyperdrive si activé
 *
 * Initialisation lazy via Proxy : le client n'est créé qu'au premier accès réel,
 * évitant les erreurs DATABASE_URL pendant la phase Collecting page data de Next.js.
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getOrCreateClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("[prisma] DATABASE_URL est manquant dans les variables d'environnement");
    }
    // PrismaNeon prend un PoolConfig (pas une instance Pool)
    const adapter = new PrismaNeon({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

// Proxy lazy : l'import du module ne crée pas le client — seul le premier appel DB le fait.
// Cela évite l'erreur "DATABASE_URL manquant" lors du Collecting page data de Next.js.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getOrCreateClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
