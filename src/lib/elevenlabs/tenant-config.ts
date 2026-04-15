/**
 * Résolution de configuration ElevenLabs par tenant.
 *
 * Principe d'isolation :
 *   - Chaque tenant a ses propres variables d'env :
 *       ELEVENLABS_TENANT_<ID>_API_KEY
 *       ELEVENLABS_TENANT_<ID>_AGENT_ID
 *   - Le tenant est résolu depuis l'en-tête `Host` de la requête.
 *   - Un mapping hostname → tenant ID est déclaré via
 *       ELEVENLABS_HOSTNAME_MAP (JSON : { "host.example.com": "tenantid" })
 *   - Fallback : ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID pour le tenant
 *     par défaut (déploiement mono-tenant).
 *
 * Ce module est server-side UNIQUEMENT. Ne jamais l'importer côté client.
 * Les clés ne sont jamais exposées au navigateur — le client passe toujours
 * par /api/agent/signed-url ou /api/tts.
 */

export interface TenantElevenLabsConfig {
  apiKey: string;
  agentId: string;
  tenantId: string;
}

/**
 * Parse ELEVENLABS_HOSTNAME_MAP depuis process.env à chaque appel.
 * Format : JSON object { "hostname": "tenantId" }
 * Ex : { "coraly.com": "default", "client-abc.coraly.com": "clientabc" }
 *
 * Intentionnellement non-cachée : la valeur doit être relue à chaque requête
 * pour que les tests puissent modifier process.env sans redémarrer le module.
 * En production (Node.js serverless), l'impact est négligeable.
 */
function parseHostnameMap(): Record<string, string> {
  const raw = process.env.ELEVENLABS_HOSTNAME_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, string>;
    }
    console.warn("[elevenlabs/tenant] ELEVENLABS_HOSTNAME_MAP invalide — JSON object attendu.");
  } catch (err) {
    console.warn("[elevenlabs/tenant] ELEVENLABS_HOSTNAME_MAP parse error:", err);
  }
  return {};
}

/**
 * Résout le tenant ID depuis le hostname de la requête.
 * Retourne "default" si le hostname n'est pas dans la map.
 */
function resolveTenantId(host: string): string {
  // Normalise : enlève le port si présent
  const hostname = host.split(":")[0].toLowerCase();
  return parseHostnameMap()[hostname] ?? "default";
}

/**
 * Retourne la configuration ElevenLabs pour le tenant associé à la requête.
 * Lève une erreur si la configuration est incomplète.
 *
 * @param request - La requête HTTP entrante (pour lire l'en-tête Host)
 * @throws Error si apiKey ou agentId sont absents pour ce tenant
 */
export function getElevenLabsConfig(request: Request): TenantElevenLabsConfig {
  const host = request.headers.get("host") ?? "localhost";
  const tenantId = resolveTenantId(host);

  const suffix = tenantId === "default" ? "" : `_${tenantId.toUpperCase()}`;

  const apiKey =
    process.env[`ELEVENLABS_TENANT${suffix}_API_KEY`] ??
    process.env.ELEVENLABS_API_KEY ??
    "";

  const agentId =
    process.env[`ELEVENLABS_TENANT${suffix}_AGENT_ID`] ??
    process.env.ELEVENLABS_AGENT_ID ??
    "";

  if (!apiKey) {
    throw new Error(
      `[elevenlabs/tenant] API key manquante pour tenant "${tenantId}" (host: ${host}). ` +
        `Attendu : ELEVENLABS_TENANT${suffix}_API_KEY ou ELEVENLABS_API_KEY.`
    );
  }
  if (!agentId) {
    throw new Error(
      `[elevenlabs/tenant] Agent ID manquant pour tenant "${tenantId}" (host: ${host}). ` +
        `Attendu : ELEVENLABS_TENANT${suffix}_AGENT_ID ou ELEVENLABS_AGENT_ID.`
    );
  }

  return { apiKey, agentId, tenantId };
}
