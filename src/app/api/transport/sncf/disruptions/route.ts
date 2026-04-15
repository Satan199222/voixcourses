import { NextRequest, NextResponse } from "next/server";
import { getTrainDisruptions } from "@/lib/transport/sncf";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { TrainDisruptionsApiResponse } from "@/lib/transport/types";

/** 20 requêtes par minute par IP. */
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60_000;

/**
 * GET /api/transport/sncf/disruptions?line_id={id}
 *
 * Perturbations actives et futures sur une ligne ferroviaire nationale.
 * `line_id` : identifiant Navitia SNCF (ex: "line:SNCF:TGV_LYRIA")
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `sncf-disruptions:${clientKey(request)}`,
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

  const lineId = request.nextUrl.searchParams.get("line_id");
  if (!lineId) {
    return NextResponse.json(
      { error: "Paramètre line_id requis." },
      { status: 400 }
    );
  }

  try {
    const disruptions = await getTrainDisruptions(lineId);
    const body: TrainDisruptionsApiResponse = { disruptions };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[sncf] disruptions failed:", err);
    return NextResponse.json(
      { error: "Récupération des perturbations impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
