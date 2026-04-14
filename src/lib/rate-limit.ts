/**
 * Rate limiter persistant via Upstash Redis (sliding window).
 *
 * Requiert les variables d'environnement :
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Fallback : si ces variables sont absentes (dev local, CI sans Redis),
 * on utilise une Map in-process. Ce fallback n'est pas persistant entre
 * instances — ne pas utiliser en production sans configurer Upstash.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// In-memory fallback (dev / CI)
// ---------------------------------------------------------------------------

interface RateEntry {
  count: number;
  resetAt: number;
}

// Map globale partagée dans l'instance serverless (fallback uniquement).
// @ts-expect-error global augmentation pour Fluid Compute
const memStore: Map<string, RateEntry> = (globalThis.__vc_rl ??= new Map());

function memRateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const next: RateEntry = { count: 1, resetAt: now + windowMs };
    memStore.set(key, next);
    return { ok: true, remaining: max - 1, resetAt: next.resetAt };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Upstash Redis path
// ---------------------------------------------------------------------------

// Initialisé une seule fois au premier appel.
let redisClient: Redis | null | undefined; // undefined = pas encore tenté

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN absent — fallback mémoire (non persistant entre instances)."
    );
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// Cache de limiteurs Upstash indexés par "max:windowSec" pour éviter de
// recréer un objet Ratelimit à chaque requête.
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(max: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const windowSec = Math.ceil(windowMs / 1000);
  const cacheKey = `${max}:${windowSec}`;

  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
        analytics: false,
      })
    );
  }

  return limiterCache.get(cacheKey)!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check un bucket { key, max, windowMs } et retourne si la requête passe.
 * Utilise Upstash Redis si configuré, sinon fallback in-memory.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const limiter = getUpstashLimiter(max, windowMs);

  if (limiter) {
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      // Upstash retourne un timestamp en millisecondes
      resetAt: result.reset,
    };
  }

  return memRateLimit(key, max, windowMs);
}

/**
 * Extrait un identifiant client depuis les headers.
 * Vercel expose l'IP via x-real-ip ou x-forwarded-for.
 * En local dev : "local" (suffisant pour tester).
 */
export function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local";
}

/**
 * Headers standards à renvoyer avec une réponse 429.
 */
export function rateLimitHeaders(
  max: number,
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    "x-ratelimit-limit": String(max),
    "x-ratelimit-remaining": String(Math.max(0, remaining)),
    "x-ratelimit-reset": String(Math.ceil(resetAt / 1000)),
    "retry-after": String(Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
