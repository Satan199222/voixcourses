/**
 * Probe 09 — Test approche bookmarklet
 *
 * Simule un utilisateur qui ouvre carrefour.fr dans son propre navigateur,
 * sélectionne un magasin, puis exécute un bookmarklet qui remplit le panier.
 *
 * Le but : valider que PATCH /api/cart fonctionne depuis la session de
 * l'utilisateur (pas celle du serveur), donc le panier est persistant
 * pour l'utilisateur.
 */
import { chromium } from "playwright";

async function run() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test Bookmarklet — remplir le panier");
  console.log("  depuis la session de l'utilisateur");
  console.log("═══════════════════════════════════════════\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });
  const page = await context.newPage();

  // ── Étape 1: Simuler un utilisateur qui ouvre carrefour.fr ────────────────
  console.log("[1] Utilisateur ouvre carrefour.fr...");
  await page.goto("https://www.carrefour.fr", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const homepageTitle = await page.title();
  console.log(`    Titre: ${homepageTitle}`);

  // Récupérer l'identifiant de session de l'utilisateur
  const userCookiesBefore = await context.cookies("https://www.carrefour.fr");
  const userSid = userCookiesBefore.find((c) => c.name === "FRONTONE_SESSID");
  console.log(`    Session utilisateur: ${userSid?.value.slice(0, 20)}...`);

  // ── Étape 2: Utilisateur sélectionne le magasin Mondelange ────────────────
  console.log("\n[2] Utilisateur sélectionne le magasin 850055...");
  await page.evaluate(async () => {
    await fetch("/set-store/850055", {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
      },
    });
  });

  // ── Étape 3: Vérifier que le panier de l'utilisateur est vide ─────────────
  console.log("\n[3] Lecture panier (devrait être vide)...");
  const cartBefore = await page.evaluate(async () => {
    const res = await fetch("/api/cart", {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
      },
    });
    return res.json();
  });
  console.log(`    Total avant: ${cartBefore.cart?.totalAmount ?? 0}€`);
  console.log(
    `    Items avant: ${
      cartBefore.cart?.items?.reduce(
        (sum, cat) => sum + (cat.products?.length || 0),
        0
      ) ?? 0
    }`
  );

  // ── Étape 3.5: Extraire basketServiceId depuis la session de l'utilisateur ─
  console.log("\n[3.5] Extraction basketServiceId dans la session utilisateur...");
  // Le basketServiceId est session-dépendant. On le récupère depuis une
  // fiche produit CHEZ L'UTILISATEUR (pas du serveur).
  await page.goto(
    "https://www.carrefour.fr/p/lait-demi-ecreme-uht-vitamine-d-lactel-3252210390014",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await page.waitForTimeout(2000);

  const userBasketServiceId = await page.evaluate((storeRef) => {
    const html = document.documentElement.innerHTML;
    const pattern = new RegExp(`[A-Z0-9]{4}-\\d{3}-${storeRef}`, "g");
    return html.match(pattern)?.[0] || null;
  }, "850055");
  console.log(`    basketServiceId utilisateur: ${userBasketServiceId}`);

  // ── Étape 4: BOOKMARKLET — simuler son exécution dans la session user ─────
  console.log("\n[4] Simulation bookmarklet (run dans contexte carrefour.fr)...");

  // IMPORTANT : on utilise le basketServiceId de la session USER, pas du serveur.
  // Dans un vrai bookmarklet, on ferait le même calcul côté client.
  const bookmarkletData = {
    basketServiceId: userBasketServiceId,
    items: [
      { ean: "3252210390014", query: "lait demi ecreme lactel" },
      { ean: "8076809585880", query: "pates spaghetti barilla" },
      { ean: "3270190021438", query: "yaourts nature" },
    ],
  };

  const bookmarkletResult = await page.evaluate(async (data) => {
    const results = [];
    for (const item of data.items) {
      const requestBody = {
        trackingRequest: {
          pageType: "productdetail",
          pageId: "productdetail",
        },
        items: [
          {
            basketServiceId: data.basketServiceId,
            counter: 1,
            ean: item.ean,
            subBasketType: "drive_clcv",
          },
        ],
      };
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "x-requested-with": "XMLHttpRequest",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const bodyText = await res.text();
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = { rawText: bodyText.slice(0, 300) };
      }
      results.push({
        ean: item.ean,
        status: res.status,
        cartTotal: body.cart?.totalAmount,
        error: body.error || body.message || body.errors,
        rawResponse: body.rawText,
        requestBody: JSON.stringify(requestBody).slice(0, 300),
      });
    }
    return results;
  }, bookmarkletData);

  console.log("    Résultats ajouts:");
  for (const r of bookmarkletResult) {
    console.log(
      `    ${r.status === 200 ? "✓" : "✗"} EAN ${r.ean} — HTTP ${r.status} — Total: ${r.cartTotal ?? "?"}€`
    );
    if (r.error) console.log(`      Erreur: ${JSON.stringify(r.error).slice(0, 200)}`);
    if (r.rawResponse) console.log(`      Raw: ${r.rawResponse}`);
    console.log(`      Request: ${r.requestBody}`);
  }

  // ── Étape 5: Relire le panier pour confirmer ──────────────────────────────
  console.log("\n[5] Relecture du panier après bookmarklet...");
  const cartAfter = await page.evaluate(async () => {
    const res = await fetch("/api/cart", {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
      },
    });
    return res.json();
  });

  const itemsInCart =
    cartAfter.cart?.items?.reduce(
      (sum, cat) => sum + (cat.products?.length || 0),
      0
    ) ?? 0;
  console.log(`    Total après: ${cartAfter.cart?.totalAmount ?? 0}€`);
  console.log(`    Items après: ${itemsInCart}`);

  if (cartAfter.cart?.items) {
    console.log("\n    Détail :");
    for (const cat of cartAfter.cart.items) {
      for (const p of cat.products || []) {
        const ean = p.product?.attributes?.ean;
        const title = p.product?.attributes?.title;
        console.log(
          `      • ${title?.slice(0, 50)} (EAN ${ean}) — ${p.totalItemPrice}€`
        );
      }
    }
  }

  // ── Étape 6: Vérifier que la session est préservée ────────────────────────
  console.log("\n[6] Session utilisateur préservée ?");
  const userCookiesAfter = await context.cookies("https://www.carrefour.fr");
  const userSidAfter = userCookiesAfter.find(
    (c) => c.name === "FRONTONE_SESSID"
  );
  const sessionPreserved = userSid?.value === userSidAfter?.value;
  console.log(`    Session avant: ${userSid?.value.slice(0, 20)}...`);
  console.log(`    Session après: ${userSidAfter?.value.slice(0, 20)}...`);
  console.log(`    Session identique: ${sessionPreserved ? "✓ OUI" : "✗ NON"}`);

  // ── Étape 7: Naviguer vers /mon-panier pour visualiser ───────────────────
  console.log("\n[7] Navigation vers /mon-panier (ce que l'utilisateur verrait)...");
  await page.goto("https://www.carrefour.fr/mon-panier", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  // Capture d'écran
  await page.screenshot({ path: "/tmp/carrefour-cart-filled.png" });
  console.log(`    Titre: ${await page.title()}`);
  console.log(`    URL: ${page.url()}`);
  console.log("    Screenshot: /tmp/carrefour-cart-filled.png");

  // Tenter de lire les produits de la page panier
  const cartItemsVisible = await page.evaluate(() => {
    const items = document.querySelectorAll(
      'article[class*="product"], [class*="cart-item"], [data-testid*="product"]'
    );
    return items.length;
  });
  console.log(`    Articles visibles dans le DOM: ${cartItemsVisible}`);

  await browser.close();

  // ── VERDICT ───────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  VERDICT");
  console.log("═══════════════════════════════════════════");
  const allAdded = bookmarkletResult.every((r) => r.status === 200);
  const cartFilled = itemsInCart > 0;
  console.log(
    `  Ajouts réussis : ${allAdded ? "✓" : "✗"} (${bookmarkletResult.filter((r) => r.status === 200).length}/${bookmarkletResult.length})`
  );
  console.log(`  Panier rempli : ${cartFilled ? "✓" : "✗"} (${itemsInCart} items)`);
  console.log(`  Session préservée : ${sessionPreserved ? "✓" : "✗"}`);
  console.log(
    `\n  Approche bookmarklet : ${
      allAdded && cartFilled && sessionPreserved
        ? "✓ FAISABLE"
        : "✗ PROBLÈME"
    }`
  );
  console.log("═══════════════════════════════════════════");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
