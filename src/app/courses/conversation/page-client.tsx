"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationClientTool,
  useConversationMode,
} from "@elevenlabs/react";
import { AccessibilityBar } from "@/components/accessibility-bar";
import { LiveRegion } from "@/components/live-region";
import { Footer } from "@/components/footer";
import { InstallExtensionBanner } from "@/components/install-extension-banner";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { sendListToExtension, useExtension } from "@/lib/extension/use-extension";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { useOrderHistory } from "@/lib/history/use-order-history";
import type { CarrefourProduct, CarrefourStore } from "@/lib/carrefour/types";

/**
 * Mode Conversation — architecture ElevenLabs Agents.
 *
 * Doc SDK : https://elevenlabs.io/docs/eleven-agents/libraries/react
 *
 * Stack :
 * - ConversationProvider : wrap le contexte + monte le WebSocket audio bidi
 * - useConversationControls() : startSession / endSession / sendUserMessage
 * - useConversationStatus() : "disconnected" | "connecting" | "connected"
 * - useConversationMode() : "speaking" | "listening"
 * - useConversationClientTool(name, handler) : enregistre un tool dynamiquement
 *   (ref pattern interne → closure toujours fresh, pas besoin de deps)
 *
 * Auth : signed URL généré par /api/agent/signed-url (xi-api-key serveur only).
 * Client tools : pas de webhooks serveur, tout s'exécute dans le browser.
 */

interface AgentCartItem {
  ean: string;
  title: string;
  quantity: number;
  price: number;
}

interface Message {
  role: "user" | "agent";
  text: string;
  at: number;
}

export default function ConversationPageClient() {
  useDocumentTitle("VoixCourses — Mode conversation");
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <AccessibilityBar />
      <LiveRegion message={announce} />
      {error && <LiveRegion message={error} urgency="assertive" />}

      <ConversationProvider
        onConnect={() => setAnnounce("Connexion établie, vous pouvez parler.")}
        onDisconnect={() => setAnnounce("Conversation terminée.")}
        onError={(m) =>
          setError(typeof m === "string" ? m : "Erreur de communication")
        }
      >
        <ConversationUI setAnnounce={setAnnounce} error={error} setError={setError} />
      </ConversationProvider>

      <Footer />
    </>
  );
}

interface UIProps {
  setAnnounce: (msg: string) => void;
  error: string | null;
  setError: (err: string | null) => void;
}

function ConversationUI({ setAnnounce, error, setError }: UIProps) {
  const extension = useExtension();
  const { prefs } = usePreferences();
  const history = useOrderHistory();
  const { startSession, endSession, sendUserMessage, sendContextualUpdate } =
    useConversationControls();
  const { status } = useConversationStatus();
  const { mode } = useConversationMode(); // "speaking" | "listening"

  const [messages, setMessages] = useState<Message[]>([]);
  const [cart, setCart] = useState<AgentCartItem[]>([]);
  const [textInput, setTextInput] = useState("");
  const [storeName, setStoreName] = useState<string | null>(null);

  // Ref toujours frais pour que get_cart_summary lise le panier courant
  const cartRef = useRef<AgentCartItem[]>([]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Synchroniser le nom du magasin sélectionné (pour l'afficher dans l'UI)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStoreName(localStorage.getItem("storeName"));
    }
  }, []);

  // ── Tools — enregistrement via hook, ref pattern interne garantit closure fresh ─
  useConversationClientTool(
    "search_product",
    async (params: Record<string, unknown>): Promise<string> => {
      const query = typeof params.query === "string" ? params.query.trim() : "";
      if (!query) return JSON.stringify({ error: "query manquant" });
      const urlParams = new URLSearchParams({ q: query });
      if (prefs.diet.length > 0) urlParams.set("diet", prefs.diet.join(","));
      try {
        const res = await fetch(`/api/search?${urlParams}`);
        if (!res.ok) return JSON.stringify({ error: `HTTP ${res.status}` });
        const data = await res.json();
        const products: CarrefourProduct[] = data.products ?? [];
        // Ne retourne que l'essentiel — on économise les tokens du contexte agent
        return JSON.stringify({
          products: products.slice(0, 3).map((p) => ({
            ean: p.ean,
            title: p.title,
            price: p.price,
            brand: p.brand,
            packaging: p.packaging,
          })),
          total: data.total ?? 0,
        });
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "fetch failed",
        });
      }
    }
  );

  useConversationClientTool(
    "add_to_cart",
    (params: Record<string, unknown>): string => {
      const ean = typeof params.ean === "string" ? params.ean : "";
      const title = typeof params.title === "string" ? params.title : "";
      const quantity = typeof params.quantity === "number" ? params.quantity : 1;
      const price = typeof params.price === "number" ? params.price : 0;
      if (!ean || !title) {
        return JSON.stringify({ error: "ean et title requis" });
      }
      setCart((prev) => {
        const existing = prev.find((i) => i.ean === ean);
        if (existing) {
          return prev.map((i) =>
            i.ean === ean ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { ean, title, quantity, price }];
      });
      return JSON.stringify({ success: true });
    }
  );

  useConversationClientTool(
    "remove_from_cart",
    (params: Record<string, unknown>): string => {
      const ean = typeof params.ean === "string" ? params.ean : "";
      setCart((prev) => prev.filter((i) => i.ean !== ean));
      return JSON.stringify({ success: true });
    }
  );

  useConversationClientTool("get_cart_summary", (): string => {
    const items = cartRef.current;
    const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
    return JSON.stringify({
      count: items.length,
      articles: items.reduce((n, i) => n + i.quantity, 0),
      total_euros: Math.round(total * 100) / 100,
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        price: i.price,
      })),
    });
  });

  // ── NOUVEAUX TOOLS : contexte, magasin, historique ────────────────────────

  /**
   * Retourne un snapshot de l'état utilisateur : magasin, extension, régime,
   * dernière commande. L'agent peut l'appeler à tout moment pour se mettre
   * à jour (mais un contextual_update initial le donne déjà au démarrage).
   */
  useConversationClientTool("get_user_context", (): string => {
    const storeRef =
      typeof window !== "undefined" ? localStorage.getItem("storeRef") : null;
    const sName =
      typeof window !== "undefined" ? localStorage.getItem("storeName") : null;
    return JSON.stringify({
      store: storeRef ? { ref: storeRef, name: sName } : null,
      extension_installed: extension.installed,
      diet: prefs.diet,
      allergens: prefs.allergens,
      last_order: history.lastEntry
        ? {
            count: history.lastEntry.count,
            total: history.lastEntry.total,
            list_text: history.lastEntry.listText,
            days_ago: Math.round(
              (Date.now() - new Date(history.lastEntry.at).getTime()) /
                (24 * 60 * 60 * 1000)
            ),
          }
        : null,
    });
  });

  /**
   * Liste les Carrefour proches d'un code postal. L'agent appelle ça quand
   * l'utilisateur n'a pas encore de magasin (ou veut en changer).
   */
  useConversationClientTool(
    "list_stores_by_postal_code",
    async (params: Record<string, unknown>): Promise<string> => {
      const cp = typeof params.postal_code === "string" ? params.postal_code : "";
      if (!/^\d{5}$/.test(cp)) {
        return JSON.stringify({
          error: "Code postal invalide (5 chiffres attendus)",
        });
      }
      try {
        const res = await fetch(`/api/stores?postalCode=${cp}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return JSON.stringify({ error: err.error ?? `HTTP ${res.status}` });
        }
        const data = await res.json();
        const stores: CarrefourStore[] = data.stores ?? [];
        return JSON.stringify({
          stores: stores.slice(0, 5).map((s) => ({
            ref: s.ref,
            name: s.name,
            format: s.format,
            distance_km: s.distance,
          })),
        });
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "fetch failed",
        });
      }
    }
  );

  /**
   * Sélectionne un magasin (appelle /api/stores POST pour initialiser la
   * session Carrefour + extraire le basketServiceId). Persiste en localStorage.
   */
  useConversationClientTool(
    "select_store",
    async (params: Record<string, unknown>): Promise<string> => {
      const storeRef = typeof params.store_ref === "string" ? params.store_ref : "";
      const name = typeof params.store_name === "string" ? params.store_name : "";
      if (!storeRef) return JSON.stringify({ error: "store_ref requis" });
      try {
        const res = await fetch("/api/stores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ storeRef }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return JSON.stringify({ error: err.error ?? `HTTP ${res.status}` });
        }
        const data = await res.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("storeRef", storeRef);
          if (data.basketServiceId) {
            localStorage.setItem("basketServiceId", data.basketServiceId);
          }
          if (name) localStorage.setItem("storeName", name);
        }
        setStoreName(name || null);
        return JSON.stringify({ success: true, store_name: name });
      } catch (err) {
        return JSON.stringify({
          error: err instanceof Error ? err.message : "fetch failed",
        });
      }
    }
  );

  /**
   * Pré-remplit le panier avec la dernière commande de l'utilisateur.
   * L'agent ré-appelle search_product pour chaque ligne (pour avoir les EAN
   * actuels et prix à jour), puis add_to_cart — c'est plus fiable qu'utiliser
   * des EAN stockés qui peuvent avoir disparu du catalogue.
   *
   * Cette fonction retourne juste le texte de la liste pour que l'agent le
   * lise naturellement et le traite comme une dictée utilisateur.
   */
  useConversationClientTool("get_last_order", (): string => {
    if (!history.lastEntry) return JSON.stringify({ error: "Aucune commande précédente." });
    return JSON.stringify({
      list_text: history.lastEntry.listText,
      count: history.lastEntry.count,
      total: history.lastEntry.total,
      days_ago: Math.round(
        (Date.now() - new Date(history.lastEntry.at).getTime()) /
          (24 * 60 * 60 * 1000)
      ),
    });
  });

  useConversationClientTool("finalize_cart", async (): Promise<string> => {
    const items = cartRef.current;
    if (items.length === 0) return JSON.stringify({ error: "Panier vide." });
    if (!extension.installed || !extension.extensionId) {
      return JSON.stringify({
        error:
          "Extension VoixCourses non installée. Invitez l'utilisateur à l'installer sur /installer pour transférer le panier.",
        action: "install_extension_needed",
      });
    }
    const storeRef =
      typeof window !== "undefined" ? localStorage.getItem("storeRef") : null;
    const basketServiceId =
      typeof window !== "undefined"
        ? localStorage.getItem("basketServiceId")
        : null;
    if (!storeRef || !basketServiceId) {
      return JSON.stringify({
        error:
          "Aucun magasin sélectionné. L'utilisateur doit d'abord aller sur /courses pour choisir un Carrefour.",
        action: "select_store_needed",
      });
    }
    const result = await sendListToExtension(extension.extensionId, {
      storeRef,
      basketServiceId,
      items: items.map((i) => ({
        ean: i.ean,
        quantity: i.quantity,
        title: i.title,
        price: i.price,
      })),
      title: `${items.length} produits · VoixCourses conversation`,
      returnUrl:
        typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (!result.ok) {
      return JSON.stringify({ error: `Erreur envoi : ${result.error}` });
    }
    return JSON.stringify({
      success: true,
      message: "Panier envoyé à l'extension.",
    });
  });

  /**
   * Construit un résumé de contexte utilisateur injecté dans la conversation
   * au démarrage via sendContextualUpdate. L'agent s'en sert pour adapter
   * son premier message (proposer de reprendre la dernière commande, de
   * choisir un magasin, d'installer l'extension, etc.).
   */
  function buildContextText(): string {
    const parts: string[] = [];
    const storeRef =
      typeof window !== "undefined" ? localStorage.getItem("storeRef") : null;
    const sName =
      typeof window !== "undefined" ? localStorage.getItem("storeName") : null;

    if (storeRef) {
      parts.push(
        `Magasin actuel : ${sName || "Carrefour"} (ref ${storeRef}) — déjà sélectionné.`
      );
    } else {
      parts.push(
        "AUCUN magasin sélectionné. Avant toute recherche produit, demande le code postal et utilise list_stores_by_postal_code puis select_store."
      );
    }

    if (extension.installed) {
      parts.push(`Extension VoixCourses installée (version ${extension.version}).`);
    } else {
      parts.push(
        "Extension VoixCourses NON installée. Si l'utilisateur arrive à la finalisation, rappelle-lui qu'il doit installer l'extension sur voixcourses.vercel.app/installer pour que le panier se transfère automatiquement."
      );
    }

    if (prefs.diet.length > 0) {
      parts.push(
        `Régime alimentaire : ${prefs.diet.join(", ")}. Ajoute systématiquement ces contraintes aux recherches produits (ex: "pâtes sans gluten" au lieu de "pâtes").`
      );
    }
    if (prefs.allergens.length > 0) {
      parts.push(
        `Allergènes à éviter : ${prefs.allergens.join(", ")}. Refuse les produits contenant ces ingrédients.`
      );
    }

    if (history.lastEntry) {
      const daysAgo = Math.round(
        (Date.now() - new Date(history.lastEntry.at).getTime()) /
          (24 * 60 * 60 * 1000)
      );
      parts.push(
        `Dernière commande il y a ${daysAgo} jour${daysAgo > 1 ? "s" : ""} : ${history.lastEntry.count} produits (${history.lastEntry.total.toFixed(2)}€). Liste : ${history.lastEntry.listText}. Propose de la reprendre si elle est récente (moins de 10 jours).`
      );
    } else {
      parts.push("Aucune commande précédente (premier achat VoixCourses).");
    }

    return parts.join(" ");
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleStart() {
    setError(null);
    setMessages([]);
    try {
      // Permission micro EXPLICITE avant démarrage (bonne pratique ElevenLabs)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/agent/signed-url");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const { signedUrl } = await res.json();

      const contextText = buildContextText();

      await startSession({
        signedUrl,
        onConnect: () => {
          // Injection du contexte dès que la session est active — l'agent
          // reçoit ces infos silencieusement (sans qu'on l'entende) et
          // adapte son premier message.
          // Délai court pour laisser le WS se stabiliser.
          setTimeout(() => {
            try {
              sendContextualUpdate(contextText);
            } catch {
              /* session peut-être fermée entre-temps */
            }
          }, 150);
        },
        onMessage: (m: { message: string; source: string }) => {
          setMessages((prev) => [
            ...prev,
            {
              role: m.source === "user" ? "user" : "agent",
              text: m.message,
              at: Date.now(),
            },
          ]);
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer la conversation."
      );
    }
  }

  function handleStop() {
    endSession();
  }

  function handleSendText() {
    const t = textInput.trim();
    if (!t || status !== "connected") return;
    sendUserMessage(t);
    setMessages((prev) => [...prev, { role: "user", text: t, at: Date.now() }]);
    setTextInput("");
  }

  const isActive = status === "connected";
  const isConnecting = status === "connecting";
  const isAgentSpeaking = mode === "speaking";

  const totalCart = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const articleCount = cart.reduce((n, i) => n + i.quantity, 0);

  // Annonce status pour aria-live
  useEffect(() => {
    if (status === "connected") {
      setAnnounce(
        isAgentSpeaking ? "L'assistant parle." : "L'assistant vous écoute."
      );
    }
  }, [status, isAgentSpeaking, setAnnounce]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/"
        className="inline-block text-sm text-[var(--accent)] underline"
        aria-label="Retour à l'accueil VoixCourses"
      >
        ← Accueil VoixCourses
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
          Mode conversation
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--bg)]">
            BETA
          </span>
        </h1>
        <p className="text-[var(--text-muted)]">
          Parlez à l&apos;assistant comme à un humain. Il cherche les produits,
          vous pose des questions, remplit votre panier.
        </p>
      </header>

      <InstallExtensionBanner />

      {/* Contexte visuel : magasin actuel (si défini), utile pour l'utilisateur
          voyant, aussi rassurant pour le non-voyant via aria-label */}
      <div
        className="flex gap-3 flex-wrap text-sm"
        aria-label="Contexte actuel"
      >
        <span
          className={`px-3 py-1.5 rounded-lg ${
            storeName
              ? "bg-[var(--bg-surface)] border border-[var(--border)]"
              : "bg-[var(--bg-surface)] border-2 border-[var(--accent)]"
          }`}
        >
          📍{" "}
          {storeName
            ? `Magasin : ${storeName}`
            : "Aucun magasin — l'assistant vous aidera à en choisir un"}
        </span>
        {extension.installed ? (
          <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--success)] text-[var(--success)]">
            ✓ Extension OK
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--accent)] text-[var(--accent)]">
            ⚠ Extension absente
          </span>
        )}
      </div>

      <section
        aria-label="Contrôle de la conversation"
        className="p-6 rounded-xl bg-[var(--bg-surface)] border-2 border-[var(--border)] text-center space-y-4"
      >
        <StatusIndicator status={status} isAgentSpeaking={isAgentSpeaking} />

        {!isActive && !isConnecting && (
          <button
            type="button"
            onClick={handleStart}
            aria-label="Démarrer la conversation avec l'assistant vocal"
            className="w-full px-6 py-5 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-bold text-xl hover:bg-[var(--accent-hover)] transition-colors"
          >
            🎤 Parler à l&apos;assistant
          </button>
        )}

        {isConnecting && (
          <div
            className="w-full px-6 py-5 rounded-xl bg-[var(--bg)] border-2 border-[var(--accent)] text-[var(--accent)] font-bold text-xl"
            role="status"
            aria-live="polite"
          >
            Connexion en cours…
          </div>
        )}

        {isActive && (
          <button
            type="button"
            onClick={handleStop}
            aria-label="Arrêter la conversation"
            className="w-full px-6 py-5 rounded-xl bg-[var(--danger)] text-white font-bold text-xl hover:brightness-110 transition-all"
          >
            ⏹ Arrêter
          </button>
        )}

        {error && (
          <p
            role="alert"
            className="p-3 rounded-lg bg-[var(--bg)] border-2 border-[var(--danger)] text-[var(--danger)] text-sm"
          >
            {error}
          </p>
        )}
      </section>

      {/* Fallback texte — utile si bruit, permission micro refusée, sourd-et-muet */}
      {isActive && (
        <section aria-label="Envoyer un message texte à l'assistant">
          <label htmlFor="text-fallback" className="sr-only">
            Message texte pour l&apos;assistant
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex gap-2"
          >
            <input
              id="text-fallback"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ou tapez votre message…"
              className="flex-1 p-3 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-3 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--accent)] text-[var(--accent)] font-semibold disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </section>
      )}

      {messages.length > 0 && (
        <section
          aria-label="Transcription de la conversation"
          className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] max-h-80 overflow-y-auto space-y-2"
        >
          <h2 className="text-lg font-bold mb-2">Conversation</h2>
          {messages.map((m, i) => (
            <div
              key={`${m.at}-${i}`}
              className={`p-2 rounded text-sm ${
                m.role === "user"
                  ? "bg-[var(--bg)] border border-[var(--border)] ml-6"
                  : "bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] mr-6"
              }`}
            >
              <span className="text-xs font-bold uppercase" aria-hidden="true">
                {m.role === "user" ? "Vous" : "Assistant"}
              </span>
              <p>{m.text}</p>
            </div>
          ))}
        </section>
      )}

      <section
        aria-label="Panier en cours de constitution"
        className="p-4 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--accent)]"
      >
        <h2 className="text-lg font-bold mb-2">
          Panier ({articleCount} article{articleCount !== 1 ? "s" : ""})
        </h2>
        {cart.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Votre panier est vide. L&apos;assistant ajoutera les produits au fur
            et à mesure.
          </p>
        ) : (
          <>
            <ul className="space-y-1 text-sm">
              {cart.map((item) => (
                <li key={item.ean} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.title}
                  </span>
                  <span className="font-semibold">
                    {(item.price * item.quantity).toFixed(2)}€
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t border-[var(--border)]">
              <span>Total</span>
              <span className="text-[var(--accent)]">
                {totalCart.toFixed(2)}€
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatusIndicator({
  status,
  isAgentSpeaking,
}: {
  status: string;
  isAgentSpeaking: boolean;
}) {
  const label =
    status === "connected"
      ? isAgentSpeaking
        ? "L'assistant parle…"
        : "Je vous écoute."
      : status === "connecting"
        ? "Connexion en cours…"
        : "Prêt à démarrer.";

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <div
        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
          status === "connected"
            ? isAgentSpeaking
              ? "border-[var(--success)] bg-[var(--success)] bg-opacity-20 animate-pulse"
              : "border-[var(--accent)] bg-[var(--accent)] bg-opacity-10"
            : "border-[var(--border)] bg-[var(--bg)]"
        }`}
        aria-hidden="true"
      >
        <span className="text-4xl">{status === "connected" ? "🎤" : "⚪"}</span>
      </div>
      <p className="font-semibold">{label}</p>
    </div>
  );
}
