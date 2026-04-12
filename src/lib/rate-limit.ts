/**
 * Rate limiter in-memory simple pour les routes API.
 *
 * Contexte : sans Redis/KV provisionné, on utilise une Map locale au process.
 * Limite en serverless (Vercel Fluid Compute) : plusieurs instances ≠ un seul
 * compteur global. Mais :
 * - Fluid Compute réutilise les instances → une majorité de requêtes tombent
 *   sur la même instance, le limiter attrape les bursts simples.
 * - Les vrais abuseurs saturés → plusieurs instances en parallèle → au pire
 *   ils passent chacun sous le seuil, mais restent détectables côté logs.
 *
 * Pour un MVP, c'est un filet de sécurité suffisant. Migrer vers Upstash KV
 * (`@upstash/ratelimit`) dès que trafic > ~100 RPS ou coût Claude visible.
 */

interface RateEntry {
  count: number;
  resetAt: number;
}

// Map globale partagée entre requêtes (dans une même instance serverless).
// @ts-expect-error global augmentation pour Fluid Compute
const store: Map<string, RateEntry> = (globalThis.__vc_rl ??= new Map());

/**
 * Check un bucket { key, max, windowMs } et retourne si la requête passe.
 * Nettoie automatiquement les entrées expirées pour ne pas grossir à l'infini.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const next: RateEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return { ok: true, remaining: max - 1, resetAt: next.resetAt };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrait un identifiant client depuis les headers.
 * Vercel expose l'IP via x-real-ip ou x-forwarded-for.
 * En local dev : "localhost" (suffisant pour tester).
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
