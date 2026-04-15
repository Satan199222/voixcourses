import { NextRequest, NextResponse } from "next/server";
import { getTrainDepartures } from "@/lib/transport/sncf";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { TrainDeparturesApiResponse } from "@/lib/transport/types";

/** 20 requêtes par minute par IP — chaque appel interroge l'API SNCF. */
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_COUNT = 30;

/**
 * GET /api/transport/sncf/departures?stop_id={id}&count={n}
 *
 * Prochains départs de trains depuis une gare nationale.
 * `stop_id` : identifiant Navitia SNCF (ex: "stop_area:SNCF:87271007" = Paris-Gare-de-Lyon)
 * `count`   : nombre max de départs (1–30, défaut 10)
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `sncf-departures:${clientKey(request)}`,
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
    Math.max(1, rawCount ? parseInt(rawCount, 10) || 10 : 10)
  );

  try {
    const { stationName, departures } = await getTrainDepartures(stopId, count);
    const body: TrainDeparturesApiResponse = {
      stationId: stopId,
      stationName,
      departures,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[sncf] departures failed:", err);
    return NextResponse.json(
      { error: "Récupération des départs impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
