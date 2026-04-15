import { NextRequest, NextResponse } from "next/server";
import { getLineInfo } from "@/lib/transport/prim";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { LineInfoApiResponse } from "@/lib/transport/types";

/** 30 requêtes par minute par IP — données statiques, peuvent être mises en cache. */
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;

/**
 * GET /api/transport/idfm/line?id={line_id}
 *
 * Informations statiques sur une ligne de transport IDFM.
 * `id` : identifiant Navitia (ex: "line:IDFM:C01371")
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `idfm-line:${clientKey(request)}`,
    RATE_MAX,
    RATE_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes. Veuillez patienter." },
      {
        status: 429,
        headers: rateLimitHeaders(RATE_MAX, rl.remaining, rl.resetAt),
      }
    );
  }

  const lineId = request.nextUrl.searchParams.get("id");
  if (!lineId) {
    return NextResponse.json(
      { error: "Paramètre id requis." },
      { status: 400 }
    );
  }

  try {
    const line = await getLineInfo(lineId);
    const body: LineInfoApiResponse = { line };
    // Cache 5 minutes côté CDN — données statiques
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[idfm] line info failed:", err);
    return NextResponse.json(
      { error: "Récupération des infos ligne impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
