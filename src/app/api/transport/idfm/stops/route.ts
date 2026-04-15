import { NextRequest, NextResponse } from "next/server";
import { searchStop } from "@/lib/transport/prim";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { StopsApiResponse } from "@/lib/transport/types";

/** 60 requêtes d'autocomplete par minute par IP. */
const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;
const MAX_QUERY_LENGTH = 120;

/**
 * GET /api/transport/idfm/stops?q={query}
 *
 * Recherche des arrêts et lieux Île-de-France Mobilités via PRIM/Navitia.
 * Utilisé pour l'autocomplete dans le formulaire VoixTransport.
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `idfm-stops:${clientKey(request)}`,
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

  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis." }, { status: 400 });
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Requête trop longue." }, { status: 413 });
  }

  try {
    const stops = await searchStop(q);
    const body: StopsApiResponse = { stops };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[idfm] stops search failed:", err);
    return NextResponse.json(
      { error: "Recherche d'arrêt impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
