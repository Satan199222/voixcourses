import type { Browser, Page } from "playwright-core";

let browser: Browser | null = null;
let page: Page | null = null;
let cloudflareReady = false;

/**
 * Stratégie d'exécution du browser Playwright :
 *
 * 1. Si `BROWSER_WS_ENDPOINT` est défini (prod Vercel) → on se connecte à un
 *    browser distant géré (ex: Browserless). Avantages : IP résidentielle
 *    (Cloudflare laisse passer), stealth intégré, zéro binary à bundler,
 *    cold start rapide.
 *
 * 2. Sinon (dev local) → on lance un Chromium local via `executablePath`
 *    (celui installé par `npx playwright install` ou la variable
 *    `CHROMIUM_PATH`). Pas d'IP résidentielle mais ça marche pour tester.
 */
async function getBrowser(): Promise<Browser> {
  if (browser) return browser;

  const { chromium } = await import("playwright-core");
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;

  if (wsEndpoint) {
    // Browser distant (Browserless ou équivalent) : une simple connexion WS
    // suffit. Le service de l'autre côté gère Chromium + stealth + IPs.
    browser = await chromium.connect(wsEndpoint);
    return browser;
  }

  // Local dev — chemin du Chromium installé par `npx playwright install`
  const localChromium =
    process.env.CHROMIUM_PATH ||
    "/home/julien/.cache/ms-playwright/chromium-1217/chrome-linux/chrome";

  browser = await chromium.launch({
    executablePath: localChromium,
    headless: true,
  });
  return browser;
}

/**
 * Vérifie qu'on est sur une vraie page Carrefour et pas un challenge
 * Cloudflare. Heuristique : __NEXT_DATA__ (site Carrefour en Next.js) ou
 * meta apple-itunes-app sont présents sur les vraies pages Carrefour,
 * absents sur les pages de challenge Cloudflare.
 */
async function isCarrefourReady(p: Page): Promise<boolean> {
  return p.evaluate(() => {
    const title = document.title || "";
    if (/just a moment|un instant|attacker|checking/i.test(title)) return false;
    const hasNext = !!document.getElementById("__NEXT_DATA__");
    const hasApple = !!document.querySelector('meta[name="apple-itunes-app"]');
    return hasNext || hasApple;
  });
}

/**
 * Retourne une page Playwright prête (Cloudflare passé).
 * Réutilise l'instance entre les appels (Fluid Compute).
 */
export async function getPage(): Promise<Page> {
  if (page && cloudflareReady) {
    return page;
  }

  const b = await getBrowser();

  const context = await b.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "fr-FR",
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
  });
  page = await context.newPage();

  await page.goto("https://www.carrefour.fr", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // Retry-wait jusqu'à 20s : si Browserless, le stealth passe souvent sous
  // 3s ; si local dev, c'est instantané.
  const deadline = Date.now() + 20_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (await isCarrefourReady(page)) {
      ready = true;
      break;
    }
    await page.waitForTimeout(500);
  }

  if (!ready) {
    console.warn("[carrefour] Page Carrefour pas prête après 20s");
  }

  cloudflareReady = true;
  return page;
}

/**
 * Exécute un fetch dans le contexte du navigateur (avec session Cloudflare).
 * Diagnostic explicite si Carrefour répond en HTML (challenge non passé).
 */
export async function browserFetch<T>(
  path: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const p = await getPage();
  return p.evaluate(
    async ({ path, options }) => {
      const res = await fetch(path, {
        method: options?.method || "GET",
        headers: {
          "x-requested-with": "XMLHttpRequest",
          accept: "application/json",
          ...options?.headers,
        },
        ...(options?.body ? { body: options.body } : {}),
      });
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      if (
        contentType.includes("text/html") ||
        text.trimStart().startsWith("<")
      ) {
        throw new Error(
          `Carrefour a répondu en HTML (status ${res.status}) au lieu de JSON. Probable challenge Cloudflare. Path : ${path}`
        );
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(
          `Carrefour a répondu en contenu non-JSON (status ${res.status}, len ${text.length}). Path : ${path}`
        );
      }
    },
    { path, options }
  );
}
