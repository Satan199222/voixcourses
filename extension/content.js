/**
 * Script injecté sur toutes les pages carrefour.fr.
 *
 * Rôle : si une liste VoixCourses est en attente dans le storage de
 * l'extension, afficher une bannière accessible avec un bouton "Remplir
 * mon panier". Au clic, appelle les API Carrefour avec les cookies
 * de l'utilisateur (session native) et redirige vers /mon-panier.
 */

const STORAGE_KEY = "voixcourses-pending-list";
const BANNER_ID = "voixcourses-banner";

function getPendingList() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

/**
 * Lire le panier actuel de l'utilisateur (dans sa session).
 */
async function readCurrentCart() {
  try {
    const res = await fetch("/api/cart", {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
      },
      credentials: "same-origin",
    });
    if (!res.ok) return { itemCount: 0, total: 0, eans: [] };
    const data = await res.json();
    const cart = data?.cart || {};
    const eans = [];
    for (const category of cart.items || []) {
      for (const p of category.products || []) {
        const ean = p.product?.attributes?.ean;
        if (ean) eans.push(ean);
      }
    }
    return {
      itemCount: eans.length,
      total: cart.totalAmount ?? 0,
      eans,
    };
  } catch {
    return { itemCount: 0, total: 0, eans: [] };
  }
}

/**
 * Vérifier si l'utilisateur est connecté à Carrefour.
 * Retourne { loggedIn: boolean, firstName?: string }.
 */
async function checkAuth() {
  try {
    const res = await fetch("/api/me", {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
      },
      credentials: "same-origin",
    });
    if (!res.ok) return { loggedIn: false };
    const data = await res.json();
    const attrs = data?.data?.attributes;
    if (attrs?.firstName || attrs?.email) {
      return {
        loggedIn: true,
        firstName: attrs.firstName || null,
        email: attrs.email || null,
      };
    }
    return { loggedIn: false };
  } catch {
    return { loggedIn: false };
  }
}

/**
 * Supprimer un produit du panier (counter: 0).
 */
async function removeFromCart(basketServiceId, ean) {
  return fetch("/api/cart", {
    method: "PATCH",
    headers: {
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/json",
      accept: "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      trackingRequest: {
        pageType: "productdetail",
        pageId: "productdetail",
      },
      items: [
        {
          basketServiceId,
          counter: 0,
          ean,
          subBasketType: "drive_clcv",
        },
      ],
    }),
  });
}

/**
 * Remplir le panier Carrefour avec les EAN fournis.
 * S'exécute dans la session utilisateur (mêmes cookies que la page).
 */
async function fillCart(list) {
  // 1. Sélectionner le magasin VoixCourses
  await fetch(`/set-store/${list.storeRef}`, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
    },
    credentials: "same-origin",
  });

  const failures = [];
  let lastTotal = 0;

  // 2. Ajouter chaque produit
  for (const ean of list.eans) {
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "x-requested-with": "XMLHttpRequest",
          "content-type": "application/json",
          accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          trackingRequest: {
            pageType: "productdetail",
            pageId: "productdetail",
          },
          items: [
            {
              basketServiceId: list.basketServiceId,
              counter: 1,
              ean,
              subBasketType: "drive_clcv",
            },
          ],
        }),
      });

      if (!res.ok) {
        failures.push(ean);
        continue;
      }

      const data = await res.json();
      lastTotal = data?.cart?.totalAmount ?? lastTotal;
    } catch {
      failures.push(ean);
    }
  }

  return { failures, total: lastTotal };
}

/**
 * Utilitaire pour créer un élément avec attributs et styles.
 * Approche safe-DOM (pas d'innerHTML).
 */
function el(tag, options = {}) {
  const e = document.createElement(tag);
  if (options.id) e.id = options.id;
  if (options.text) e.textContent = options.text;
  if (options.style) e.setAttribute("style", options.style);
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      e.setAttribute(k, v);
    }
  }
  return e;
}

/**
 * Afficher la bannière VoixCourses en haut de la page carrefour.fr.
 * Conçue pour être accessible clavier + screen reader.
 *
 * Contenu dynamique :
 * - Affiche l'état de connexion (si non connecté, suggère de se connecter)
 * - Affiche le nombre d'articles déjà dans le panier
 * - Propose "Ajouter à mon panier" (garde les existants) ou "Remplacer"
 */
async function showBanner(list) {
  if (document.getElementById(BANNER_ID)) return;

  // Récupérer l'état actuel en parallèle
  const [currentCart, auth] = await Promise.all([
    readCurrentCart(),
    checkAuth(),
  ]);

  const banner = el("div", {
    id: BANNER_ID,
    attrs: {
      role: "region",
      "aria-label": "VoixCourses — liste en attente",
    },
    style:
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;" +
      "background:#0f0f1a;color:#f0f0f5;border-bottom:3px solid #4cc9f0;" +
      "padding:16px 24px;font-family:system-ui,sans-serif;font-size:16px;" +
      "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
      "box-shadow:0 2px 12px rgba(0,0,0,0.3);",
  });

  // Partie gauche : titre + description de la liste + état actuel
  const left = el("div", { style: "flex:1;min-width:0" });

  const topLine = el("div", { style: "margin-bottom:4px" });
  topLine.appendChild(
    el("strong", { text: "VoixCourses", style: "color:#4cc9f0" })
  );
  topLine.appendChild(
    document.createTextNode(` — Liste prête : ${list.title}`)
  );
  left.appendChild(topLine);

  // Ligne statut : connexion + panier actuel
  const statusLine = el("div", {
    style: "font-size:13px;color:#a0a8b8",
  });

  // Connexion
  if (auth.loggedIn) {
    const loggedSpan = el("span", {
      text: `✓ Connecté${auth.firstName ? ` (${auth.firstName})` : ""}`,
      style: "color:#2ee8a5;font-weight:600",
    });
    statusLine.appendChild(loggedSpan);
  } else {
    const notLoggedSpan = el("span", {
      text: "⚠ Non connecté",
      style: "color:#ffd166;font-weight:600",
    });
    statusLine.appendChild(notLoggedSpan);
    statusLine.appendChild(document.createTextNode(" — "));
    const loginLink = el("a", {
      text: "Se connecter pour payer",
      href: "/mon-compte/login",
      style: "color:#4cc9f0;text-decoration:underline",
    });
    statusLine.appendChild(loginLink);
  }

  statusLine.appendChild(document.createTextNode(" · "));

  // Panier actuel
  if (currentCart.itemCount > 0) {
    const cartSpan = el("span", {
      text: `Panier actuel : ${currentCart.itemCount} article${currentCart.itemCount > 1 ? "s" : ""} (${currentCart.total.toFixed(2)}€)`,
      style: "color:#ffd166",
    });
    statusLine.appendChild(cartSpan);
  } else {
    statusLine.appendChild(
      document.createTextNode("Panier actuel vide")
    );
  }

  left.appendChild(statusLine);

  // Partie droite : boutons
  const right = el("div", {
    style: "display:flex;gap:12px;align-items:center;flex-wrap:wrap",
  });

  const itemCount = list.eans.length;

  // Bouton principal : ajoute à l'existant
  const fillBtn = el("button", {
    id: "voixcourses-fill",
    text: currentCart.itemCount > 0
      ? `Ajouter (${itemCount})`
      : `Remplir mon panier (${itemCount})`,
    attrs: {
      "aria-label":
        currentCart.itemCount > 0
          ? `Ajouter ${itemCount} produit${itemCount > 1 ? "s" : ""} VoixCourses à votre panier existant de ${currentCart.itemCount} article${currentCart.itemCount > 1 ? "s" : ""}`
          : `Remplir mon panier Carrefour avec ${itemCount} produit${itemCount > 1 ? "s" : ""} de VoixCourses`,
      type: "button",
      "data-action": "add",
    },
    style:
      "padding:10px 20px;background:#4cc9f0;color:#0f0f1a;border:0;" +
      "border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;",
  });
  right.appendChild(fillBtn);

  // Bouton "Remplacer" visible seulement si le panier n'est pas vide
  if (currentCart.itemCount > 0) {
    const replaceBtn = el("button", {
      id: "voixcourses-replace",
      text: "Remplacer",
      attrs: {
        "aria-label": `Vider mon panier actuel (${currentCart.itemCount} article${currentCart.itemCount > 1 ? "s" : ""}) et le remplacer par la liste VoixCourses (${itemCount} produit${itemCount > 1 ? "s" : ""})`,
        type: "button",
        "data-action": "replace",
      },
      style:
        "padding:10px 16px;background:transparent;color:#ffd166;" +
        "border:1px solid #ffd166;border-radius:8px;font-size:14px;cursor:pointer;",
    });
    right.appendChild(replaceBtn);
  }

  const dismissBtn = el("button", {
    id: "voixcourses-dismiss",
    text: "Ignorer",
    attrs: {
      "aria-label": "Ignorer cette liste VoixCourses",
      type: "button",
    },
    style:
      "padding:10px 16px;background:transparent;color:#f0f0f5;" +
      "border:1px solid #2b3a55;border-radius:8px;font-size:14px;cursor:pointer;",
  });
  right.appendChild(dismissBtn);

  // Zone aria-live (visible screen reader only)
  const status = el("div", {
    id: "voixcourses-status",
    attrs: { role: "status", "aria-live": "polite" },
    style:
      "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;",
  });

  banner.appendChild(left);
  banner.appendChild(right);
  banner.appendChild(status);

  document.documentElement.appendChild(banner);

  // Focus automatique sur le bouton principal
  setTimeout(() => fillBtn.focus(), 100);

  /**
   * Ajouter la liste au panier — optionnellement après avoir vidé l'existant.
   */
  async function applyList(mode /* "add" | "replace" */) {
    fillBtn.setAttribute("disabled", "true");
    const replaceBtn = document.getElementById("voixcourses-replace");
    if (replaceBtn) replaceBtn.setAttribute("disabled", "true");

    if (mode === "replace" && currentCart.eans.length > 0) {
      status.textContent = `Suppression des ${currentCart.itemCount} articles existants...`;
      fillBtn.textContent = "Vidage du panier...";
      for (const existingEan of currentCart.eans) {
        await removeFromCart(list.basketServiceId, existingEan);
      }
    }

    status.textContent = "Ajout des produits à votre panier en cours...";
    fillBtn.textContent = "Ajout en cours...";

    const { failures, total } = await fillCart(list);

    if (failures.length === 0) {
      status.textContent = `Panier rempli. ${itemCount} produits pour ${total.toFixed(2)} euros. Redirection vers votre panier.`;
      chrome.storage.local.remove([STORAGE_KEY]);
      // URL du panier — dépend du mode de livraison du magasin.
      // /cart/driveclcv pour Drive, /cart/delivery pour livraison.
      // On tente driveclcv qui est le plus courant, avec fallback.
      setTimeout(() => {
        window.location.href = "/cart/driveclcv";
      }, 600);
    } else {
      status.textContent = `Ajout terminé avec ${failures.length} erreur. Total : ${total.toFixed(2)} euros.`;
      fillBtn.removeAttribute("disabled");
      fillBtn.textContent = `Panier partiellement rempli (${failures.length} erreur${failures.length > 1 ? "s" : ""})`;
    }
  }

  fillBtn.addEventListener("click", () => applyList("add"));

  const replaceBtn = document.getElementById("voixcourses-replace");
  if (replaceBtn) {
    replaceBtn.addEventListener("click", () => {
      const confirmMsg = `Voulez-vous vider votre panier actuel (${currentCart.itemCount} article${currentCart.itemCount > 1 ? "s" : ""}) et le remplacer par la liste VoixCourses (${itemCount} produit${itemCount > 1 ? "s" : ""}) ?`;
      if (window.confirm(confirmMsg)) {
        applyList("replace");
      }
    });
  }

  dismissBtn.addEventListener("click", () => {
    chrome.storage.local.remove([STORAGE_KEY]);
    banner.remove();
  });
}

// Au chargement : vérifier si une liste est en attente
(async () => {
  const list = await getPendingList();
  if (list) showBanner(list);
})();

// Réagir si la liste change (autre onglet, nouvel envoi)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    const newList = changes[STORAGE_KEY].newValue;
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
    if (newList) showBanner(newList);
  }
});
