// ---------------------------------------------------------------------------
// Types Navitia API (réponses brutes)
// ---------------------------------------------------------------------------

export interface NavitiaCoords {
  lat: number;
  lon: number;
}

export interface NavitiaStopArea {
  id: string;
  name: string;
  label: string;
  coord: NavitiaCoords;
  timezone: string;
}

export interface NavitiaAddress {
  id: string;
  name: string;
  label: string;
  coord: NavitiaCoords;
  house_number: number;
}

export interface NavitiaPlace {
  id: string;
  name: string;
  quality: number;
  embedded_type: "stop_area" | "address" | "poi" | "administrative_region";
  stop_area?: NavitiaStopArea;
  address?: NavitiaAddress;
}

export interface NavitiaDisplayInfo {
  network: string;
  direction: string;
  label: string;
  color: string;
  text_color: string;
  commercial_mode: string;
  physical_mode: string;
  description: string;
}

export interface NavitiaStopDateTime {
  stop_point: {
    id: string;
    name: string;
    label: string;
    coord: NavitiaCoords;
  };
  departure_date_time: string;
  arrival_date_time: string;
}

export interface NavitiaSection {
  type:
    | "public_transport"
    | "street_network"
    | "waiting"
    | "transfer"
    | "crow_fly";
  duration: number; // secondes
  departure_date_time: string; // YYYYMMDDTHHMMSS
  arrival_date_time: string;
  from?: NavitiaPlace;
  to?: NavitiaPlace;
  display_informations?: NavitiaDisplayInfo;
  stop_date_times?: NavitiaStopDateTime[];
}

export interface NavitiaFare {
  total: { value: string; currency: string };
  found: boolean;
}

export interface NavitiaJourney {
  duration: number; // secondes
  departure_date_time: string;
  arrival_date_time: string;
  nb_transfers: number;
  sections: NavitiaSection[];
  fare: NavitiaFare;
}

// ---------------------------------------------------------------------------
// Types normalisés pour l'UI
// ---------------------------------------------------------------------------

export interface TransportStop {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  type: NavitiaPlace["embedded_type"];
}

export interface TransportLeg {
  type: "transit" | "walk" | "wait";
  duration: number; // secondes
  from?: string;
  to?: string;
  lineName?: string;
  lineColor?: string;
  direction?: string;
  mode?: string;
  stops?: string[];
}

export interface TransportJourney {
  id: string;
  totalDuration: number; // secondes
  transfers: number;
  departure: string; // ISO 8601
  arrival: string;
  legs: TransportLeg[];
  fare?: { amount: string; currency: string };
}

// ---------------------------------------------------------------------------
// Payloads API — Navitia (déjà existant)
// ---------------------------------------------------------------------------

export interface StopsApiResponse {
  stops: TransportStop[];
}

export interface JourneyApiResponse {
  journeys: TransportJourney[];
}

// ---------------------------------------------------------------------------
// Types PRIM/IDFM — temps réel Île-de-France
// ---------------------------------------------------------------------------

/** Prochain passage temps réel à un arrêt (toutes lignes). */
export interface TransportDeparture {
  /** Identifiant unique du passage (trip_id + datetime). */
  id: string;
  /** Nom court de la ligne (ex: "13", "RER A"). */
  lineName: string;
  /** Code officiel (ex: "M13", "A"). */
  lineCode: string;
  /** Mode de transport (ex: "Métro", "Bus", "RER"). */
  mode: string;
  /** Direction / terminus. */
  direction: string;
  /** Heure de passage attendue (temps réel) en ISO 8601. */
  expectedTime: string;
  /** Heure de passage théorique en ISO 8601. */
  scheduledTime: string;
  /** Retard en secondes (négatif = avance). */
  delay: number;
  /** `true` si l'heure est issue de données temps réel. */
  realTime: boolean;
  /** Voie / quai, si disponible. */
  platform?: string;
  /** Couleur de la ligne (hex sans `#`). */
  lineColor?: string;
}

/** Informations statiques sur une ligne de transport. */
export interface TransportLineInfo {
  id: string;
  /** Nom complet (ex: "Métro 13"). */
  name: string;
  /** Code court (ex: "13"). */
  code: string;
  /** Mode commercial (ex: "Métro", "Bus"). */
  mode: string;
  /** Réseau opérateur. */
  network: string;
  /** Couleur hex de la ligne (sans `#`). */
  color?: string;
  /** Couleur du texte sur fond ligne (hex sans `#`). */
  textColor?: string;
}

/** Perturbation ou alerte sur une ligne. */
export interface TransportDisruption {
  id: string;
  /** Statut temporel de la perturbation. */
  status: "active" | "future" | "past";
  /** Sévérité (impact voyageur). */
  severity:
    | "blocking"
    | "significant_delays"
    | "reduced_service"
    | "information";
  /** Cause (ex: "incident voyageur", "travaux"). */
  cause: string;
  /** Titre court affiché dans l'UI. */
  title: string;
  /** Message complet. */
  message: string;
  /** Début de la perturbation (ISO 8601). */
  startDate?: string;
  /** Fin prévue (ISO 8601). */
  endDate?: string;
  /** IDs des lignes affectées. */
  lines?: string[];
}

// ---------------------------------------------------------------------------
// Types SNCF — ferroviaire national
// ---------------------------------------------------------------------------

/** Départ de train depuis une gare nationale. */
export interface TrainDeparture {
  id: string;
  /** Numéro de train (ex: "TGV 6201"). */
  trainNumber: string;
  /** Gare de destination finale. */
  direction: string;
  /** Heure de départ prévue (temps réel) en ISO 8601. */
  expectedTime: string;
  /** Heure de départ théorique en ISO 8601. */
  scheduledTime: string;
  /** Retard en secondes. */
  delay: number;
  /** Voie de départ, si disponible. */
  platform?: string;
  /** Transporteur (ex: "OUIGO", "Intercités"). */
  carrier?: string;
  /** `true` si le train est perturbé. */
  disrupted: boolean;
}

// ---------------------------------------------------------------------------
// Payloads API — PRIM/IDFM + SNCF
// ---------------------------------------------------------------------------

export interface DeparturesApiResponse {
  stopId: string;
  stopName: string;
  departures: TransportDeparture[];
}

export interface LineInfoApiResponse {
  line: TransportLineInfo;
}

export interface DisruptionsApiResponse {
  disruptions: TransportDisruption[];
}

export interface TrainDeparturesApiResponse {
  stationId: string;
  stationName: string;
  departures: TrainDeparture[];
}

export interface TrainDisruptionsApiResponse {
  disruptions: TransportDisruption[];
}
