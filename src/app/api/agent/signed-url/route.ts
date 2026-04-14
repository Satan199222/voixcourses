import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * Génère un signed URL ElevenLabs pour que le browser puisse se connecter
 * au WebSocket de l'agent sans exposer la clé API côté client.
 *
 * Flow :
 * 1. Browser appelle GET /api/agent/signed-url
 * 2. Nous appelons ElevenLabs avec xi-api-key (server-side only)
 * 3. On retourne le signed_url (valide ~15 min)
 * 4. Browser ouvre WebSocket sur cet URL → conversation démarre
 */

const RATE_MAX = 10;
const RATE_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const rl = await rateLimit(
    `agent-signed-url:${clientKey(request)}`,
    RATE_MAX,
    RATE_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de sessions démarrées. Veuillez patienter." },
      {
        status: 429,
        headers: rateLimitHeaders(RATE_MAX, rl.remaining, rl.resetAt),
      }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    console.error("[agent] ELEVENLABS_API_KEY ou ELEVENLABS_AGENT_ID manquant");
    return NextResponse.json(
      { error: "Agent vocal non configuré sur le serveur." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[agent] ElevenLabs signed_url failed:", res.status, errText);
      return NextResponse.json(
        { error: "Impossible de démarrer la session vocale." },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { signed_url: string };
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error("[agent] signed_url error:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'initialisation de l'agent." },
      { status: 500 }
    );
  }
}
