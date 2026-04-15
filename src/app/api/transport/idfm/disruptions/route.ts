import { NextRequest, NextResponse } from "next/server";
import { getDisruptions } from "@/lib/transport/prim";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import type { DisruptionsApiResponse } from "@/lib/transport/types";

/** 30 requêtes par minute par IP. */
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;

/**
 * GET /api/transport/idfm/disruptions?line_id={id}
 *
 * Perturbations actives et futures sur une ligne IDFM.
 * `line_id` : identifiant Navitia (ex: "line:IDFM:C01371")
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(
    `idfm-disruptions:${clientKey(request)}`,
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
    const disruptions = await getDisruptions(lineId);
    const body: DisruptionsApiResponse = { disruptions };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[idfm] disruptions failed:", err);
    return NextResponse.json(
      { error: "Récupération des perturbations impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
