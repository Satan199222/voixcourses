import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getElevenLabsConfig } from "./tenant-config";

function makeRequest(host: string): Request {
  return new Request("https://example.com/api/test", {
    headers: { host },
  });
}

describe("getElevenLabsConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("retourne la config par défaut si le host n'est pas dans la map", () => {
    process.env.ELEVENLABS_API_KEY = "key-default";
    process.env.ELEVENLABS_AGENT_ID = "agent-default";
    delete process.env.ELEVENLABS_HOSTNAME_MAP;

    const config = getElevenLabsConfig(makeRequest("unknown.example.com"));
    expect(config.apiKey).toBe("key-default");
    expect(config.agentId).toBe("agent-default");
    expect(config.tenantId).toBe("default");
  });

  it("retourne la config tenant spécifique quand le host est mappé", () => {
    process.env.ELEVENLABS_HOSTNAME_MAP = JSON.stringify({
      "tenant-a.voixcourses.com": "tenanta",
    });
    process.env.ELEVENLABS_TENANT_TENANTA_API_KEY = "key-tenanta";
    process.env.ELEVENLABS_TENANT_TENANTA_AGENT_ID = "agent-tenanta";
    process.env.ELEVENLABS_API_KEY = "key-default";
    process.env.ELEVENLABS_AGENT_ID = "agent-default";

    const config = getElevenLabsConfig(makeRequest("tenant-a.voixcourses.com"));
    expect(config.apiKey).toBe("key-tenanta");
    expect(config.agentId).toBe("agent-tenanta");
    expect(config.tenantId).toBe("tenanta");
  });

  it("ignore le port dans le hostname", () => {
    process.env.ELEVENLABS_API_KEY = "key-default";
    process.env.ELEVENLABS_AGENT_ID = "agent-default";
    delete process.env.ELEVENLABS_HOSTNAME_MAP;

    const config = getElevenLabsConfig(makeRequest("localhost:3000"));
    expect(config.tenantId).toBe("default");
  });

  it("lève une erreur si la clé API est absente", () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_HOSTNAME_MAP;

    expect(() => getElevenLabsConfig(makeRequest("localhost"))).toThrow(
      /API key manquante/
    );
  });

  it("lève une erreur si l'agent ID est absent", () => {
    process.env.ELEVENLABS_API_KEY = "key-default";
    delete process.env.ELEVENLABS_AGENT_ID;
    delete process.env.ELEVENLABS_HOSTNAME_MAP;

    expect(() => getElevenLabsConfig(makeRequest("localhost"))).toThrow(
      /Agent ID manquant/
    );
  });

  it("fallback sur les vars par défaut si les vars tenant sont absentes", () => {
    process.env.ELEVENLABS_HOSTNAME_MAP = JSON.stringify({
      "tenant-b.voixcourses.com": "tenantb",
    });
    // Pas de ELEVENLABS_TENANT_TENANTB_API_KEY — fallback sur défaut
    process.env.ELEVENLABS_API_KEY = "key-default";
    process.env.ELEVENLABS_AGENT_ID = "agent-default";

    const config = getElevenLabsConfig(makeRequest("tenant-b.voixcourses.com"));
    expect(config.apiKey).toBe("key-default");
    expect(config.agentId).toBe("agent-default");
    expect(config.tenantId).toBe("tenantb");
  });
});
