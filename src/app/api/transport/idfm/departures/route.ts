import { NextRequest, NextResponse } from "next/server";
import { getNextDepartures } from "@/lib/transport/prim";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { DeparturesApiResponse } from "@/lib/transport/types";

/** 30 requêtes de temps réel par minute par IP. */
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_COUNT = 20;

/**
 * GET /api/transport/idfm/departures?stop_id={id}&count={n}
 *
 * Prochains passages temps réel à un arrêt Île-de-France.
 * `stop_id` : identifiant Navitia IDFM (ex: "stop_area:IDFM:monomodalStopPlace:SP_2")
 * `count`   : nombre max de passages par ligne (1–20, défaut 3)
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `idfm-departures:${clientKey(request)}`,
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

  const stopId = request.nextUrl.searchParams.get("stop_id");
  if (!stopId) {
    return NextResponse.json(
      { error: "Paramètre stop_id requis." },
      { status: 400 }
    );
  }

  const rawCount = request.nextUrl.searchParams.get("count");
  const count = Math.min(
    MAX_COUNT,
    Math.max(1, rawCount ? parseInt(rawCount, 10) || 3 : 3)
  );

  try {
    const departures = await getNextDepartures(stopId, count);
    const body: DeparturesApiResponse = {
      stopId,
      stopName: departures[0]?.direction ?? stopId,
      departures,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[idfm] departures failed:", err);
    return NextResponse.json(
      { error: "Récupération des passages impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
