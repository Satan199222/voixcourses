/**
 * Client SNCF Open Data REST API v1.
 *
 * Documentation : https://doc.navitia.io/ (SNCF utilise Navitia)
 * Token : https://api.sncf.com/ (inscription gratuite)
 *
 * Variables d'environnement requises :
 *   SNCF_API_TOKEN   — jeton SNCF Open Data
 *
 * Fonctions exposées :
 *   getTrainDepartures(stopId)   → prochains départs depuis une gare
 *   getTrainDisruptions(lineId)  → perturbations sur une ligne ferroviaire
 */

import type { TrainDeparture, TransportDisruption } from "./types";

const SNCF_BASE = "https://api.sncf.com/v1/coverage/sncf";
const FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  const token = process.env.SNCF_API_TOKEN;
  if (!token) {
    throw new Error(
      "[sncf] SNCF_API_TOKEN absent — obtenez un jeton sur https://api.sncf.com/"
    );
  }
  return token;
}

/**
 * Requête SNCF avec authentification Basic (token:'' comme username:password).
 */
async function sncfFetch<T>(path: string): Promise<T> {
  const url = `${SNCF_BASE}/${path}`;
  const credentials = Buffer.from(`${getToken()}:`).toString("base64");

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`[sncf] HTTP ${res.status} pour ${path}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types bruts SNCF REST (Navitia)
// ---------------------------------------------------------------------------

interface SncfDeparture {
  display_informations: {
    network: string;
    direction: string;
    label: string;
    color: string;
    physical_mode: string;
    commercial_mode: string;
    trip_short_name: string;
    headsign: string;
  };
  stop_date_time: {
    departure_date_time: string; // YYYYMMDDTHHMMSS
    base_departure_date_time: string;
    data_freshness: "realtime" | "base_schedule";
  };
  stop_point: {
    id: string;
    name: string;
    label: string;
  };
  route: {
    id: string;
    name: string;
  };
  links: Array<{ id: string; type: string }>;
}

interface SncfDisruption {
  id: string;
  status: string;
  severity: {
    name: string;
    effect: string;
    color: string;
  };
  cause: string;
  messages: Array<{ text: string; channel: { name: string } }>;
  application_periods: Array<{ begin: string; end: string }>;
  impacted_objects: Array<{
    pt_object: { id: string; name: string; embedded_type: string };
  }>;
}

// ---------------------------------------------------------------------------
// Helpers de normalisation
// ---------------------------------------------------------------------------

/** Convertit "YYYYMMDDTHHMMSS" (Navitia/SNCF) → ISO 8601. */
function sncfDateToISO(dt: string): string {
  const y = dt.slice(0, 4);
  const mo = dt.slice(4, 6);
  const d = dt.slice(6, 8);
  const h = dt.slice(9, 11);
  const mi = dt.slice(11, 13);
  const s = dt.slice(13, 15);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

function normalizeDeparture(dep: SncfDeparture, idx: number): TrainDeparture {
  const info = dep.display_informations;
  const sdt = dep.stop_date_time;

  const expectedISO = sncfDateToISO(sdt.departure_date_time);
  const scheduledISO = sncfDateToISO(sdt.base_departure_date_time);
  const delay = Math.round(
    (new Date(expectedISO).getTime() - new Date(scheduledISO).getTime()) / 1000
  );

  // Numéro de train : tri par headsign, trip_short_name ou label
  const trainNumber =
    info.headsign ||
    info.trip_short_name ||
    `${info.commercial_mode} ${info.label}`.trim();

  // Transporteur : détecté depuis le mode commercial
  const carrier =
    info.commercial_mode &&
    info.commercial_mode !== info.physical_mode
      ? info.commercial_mode
      : info.network || undefined;

  return {
    id: `sncf-${dep.stop_point.id}-${sdt.departure_date_time}-${idx}`,
    trainNumber,
    direction: info.direction,
    expectedTime: expectedISO,
    scheduledTime: scheduledISO,
    delay,
    carrier,
    disrupted: delay > 60 || sdt.data_freshness === "realtime" && delay > 0,
  };
}

function mapSeverity(effect: string): TransportDisruption["severity"] {
  switch (effect) {
    case "NO_SERVICE":
    case "STOP_MOVED":
      return "blocking";
    case "SIGNIFICANT_DELAYS":
      return "significant_delays";
    case "REDUCED_SERVICE":
    case "DETOUR":
      return "reduced_service";
    default:
      return "information";
  }
}

function mapStatus(status: string): TransportDisruption["status"] {
  if (status === "active") return "active";
  if (status === "future") return "future";
  return "past";
}

function normalizeDisruption(d: SncfDisruption): TransportDisruption {
  const mainMsg =
    d.messages.find((m) => m.channel.name === "titre")?.text ??
    d.messages[0]?.text ??
    "";
  const detailMsg =
    d.messages.find((m) => m.channel.name === "message")?.text ??
    mainMsg;

  const period = d.application_periods[0];
  const lines = d.impacted_objects
    .filter(
      (o) =>
        o.pt_object.embedded_type === "line" ||
        o.pt_object.embedded_type === "line_section"
    )
    .map((o) => o.pt_object.id);

  return {
    id: d.id,
    status: mapStatus(d.status),
    severity: mapSeverity(d.severity.effect),
    cause: d.cause,
    title: mainMsg,
    message: detailMsg,
    startDate: period?.begin ? sncfDateToISO(period.begin) : undefined,
    endDate: period?.end ? sncfDateToISO(period.end) : undefined,
    lines: lines.length > 0 ? lines : undefined,
  };
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Prochains départs de trains depuis une gare SNCF.
 * @param stopId  Identifiant Navitia SNCF (ex: "stop_area:SNCF:87271007" = Paris-Lyon)
 * @param count   Nombre maximum de départs (défaut 10)
 */
export async function getTrainDepartures(
  stopId: string,
  count = 10
): Promise<{ stationName: string; departures: TrainDeparture[] }> {
  const params = new URLSearchParams({
    count: String(count),
    data_freshness: "realtime",
  });

  const data = await sncfFetch<{
    departures?: SncfDeparture[];
    context?: { current_datetime: string };
  }>(
    `stop_areas/${encodeURIComponent(stopId)}/departures?${params}`
  );

  const departures = (data.departures ?? []).map(normalizeDeparture);
  const stationName = data.departures?.[0]?.stop_point.name ?? stopId;

  // Tri chronologique
  departures.sort(
    (a, b) =>
      new Date(a.expectedTime).getTime() - new Date(b.expectedTime).getTime()
  );

  return { stationName, departures };
}

/**
 * Perturbations actives ou futures sur une ligne ferroviaire nationale.
 * @param lineId  Identifiant Navitia SNCF (ex: "line:SNCF:TGV_LYRIA")
 */
export async function getTrainDisruptions(
  lineId: string
): Promise<TransportDisruption[]> {
  const params = new URLSearchParams({
    filter: `line.id=${lineId}`,
    status: "active future",
  });

  const data = await sncfFetch<{ disruptions?: SncfDisruption[] }>(
    `disruptions?${params}`
  );

  return (data.disruptions ?? []).map(normalizeDisruption);
}
