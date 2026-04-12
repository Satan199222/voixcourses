"use client";

import { useState } from "react";
import type { Cart, DeliverySlot } from "@/lib/carrefour/types";
import {
  generateBookmarklet,
  generateReadableScript,
  type BookmarkletPayload,
} from "@/lib/bookmarklet/generate";

interface CartHandoffProps {
  cart: Cart | null;
  slot: DeliverySlot | null;
  storeRef: string;
  basketServiceId: string;
}

/**
 * Écran final du flow : remet la liste à l'utilisateur pour qu'il la
 * récupère sur carrefour.fr dans sa propre session.
 *
 * Deux options présentées :
 * 1. Bookmarklet — méthode recommandée (1 clic sur carrefour.fr)
 * 2. Liste manuelle — fallback, l'utilisateur suit les liens un à un
 */
export function CartHandoff({
  cart,
  slot,
  storeRef,
  basketServiceId,
}: CartHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  if (!cart || cart.items.length === 0) return null;

  const payload: BookmarkletPayload = {
    storeRef,
    basketServiceId,
    eans: cart.items.map((i) => i.ean),
  };
  const bookmarkletUrl = generateBookmarklet(payload);

  async function handleCopyBookmarklet() {
    try {
      await navigator.clipboard.writeText(bookmarkletUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Si la Clipboard API échoue, l'utilisateur peut drag-and-drop le lien
    }
  }

  const slotText = slot
    ? `${new Date(slot.begDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })} de ${new Date(slot.begDate).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })} à ${new Date(slot.endDate).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <section
      aria-label="Récupérer votre panier sur Carrefour"
      className="space-y-6"
    >
      {/* Résumé panier */}
      <div className="p-6 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--accent)]">
        <h3 className="text-lg font-bold mb-3">Votre sélection</h3>
        <ul className="space-y-2 mb-4">
          {cart.items.map((item) => (
            <li key={item.ean} className="flex justify-between text-sm">
              <span>
                {item.quantity}× {item.title}
              </span>
              <span className="font-semibold">
                {item.price.toFixed(2)}€
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-lg font-bold pt-3 border-t border-[var(--border)]">
          <span>Total</span>
          <span
            className="text-[var(--accent)]"
            aria-label={`Total : ${cart.totalAmount.toFixed(2).replace(".", " euros ")}`}
          >
            {cart.totalAmount.toFixed(2)}€
          </span>
        </div>
        {slotText && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Créneau disponible : {slotText}
          </p>
        )}
      </div>

      {/* Instructions bookmarklet */}
      <div className="p-6 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--border)]">
        <h3 className="text-lg font-bold mb-3">
          Ajouter à mon panier Carrefour
        </h3>
        <p className="text-[var(--text-muted)] mb-4">
          Votre panier est prêt. Pour le retrouver dans votre session Carrefour
          personnelle, suivez ces étapes :
        </p>

        <ol className="space-y-3 list-decimal list-inside mb-4">
          <li>
            <strong>Copier le lien magique ci-dessous</strong> dans le
            presse-papiers
          </li>
          <li>
            Ouvrir{" "}
            <a
              href="https://www.carrefour.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[var(--accent)]"
            >
              carrefour.fr
            </a>{" "}
            dans un nouvel onglet
          </li>
          <li>
            <strong>Coller le lien</strong> dans la barre d'adresse (Ctrl+L puis
            Ctrl+V) et appuyer sur Entrée
          </li>
          <li>
            Le panier se remplit automatiquement, vous arrivez sur la page
            panier
          </li>
        </ol>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCopyBookmarklet}
            aria-label={
              copied
                ? "Lien copié dans le presse-papiers"
                : `Copier le lien magique pour ajouter ${cart.items.length} produit${cart.items.length > 1 ? "s" : ""} au panier Carrefour`
            }
            className={`px-6 py-3 rounded-lg font-bold text-lg transition-colors ${
              copied
                ? "bg-[var(--success)] text-[var(--bg)]"
                : "bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            {copied ? "✓ Copié !" : "Copier le lien magique"}
          </button>

          <a
            href="https://www.carrefour.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border-2 border-[var(--accent)] text-[var(--accent)] font-bold text-lg hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors"
          >
            Ouvrir carrefour.fr
          </a>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Voir le code technique du lien magique
          </summary>
          <pre className="mt-2 p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-xs overflow-auto">
            {showScript ? generateReadableScript(payload) : bookmarkletUrl.slice(0, 200) + "..."}
          </pre>
          <button
            type="button"
            onClick={() => setShowScript((s) => !s)}
            className="mt-2 text-sm underline text-[var(--text-muted)]"
          >
            {showScript ? "Masquer" : "Afficher"} le code lisible
          </button>
        </details>
      </div>

      {/* Fallback liste manuelle */}
      <details className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
        <summary className="cursor-pointer font-semibold">
          Ça ne fonctionne pas ? Voir la liste manuelle
        </summary>
        <p className="text-sm text-[var(--text-muted)] mt-3 mb-3">
          Voici la liste des produits avec leurs liens directs sur
          carrefour.fr. Cliquez sur chacun pour ouvrir la fiche produit et
          ajouter au panier manuellement.
        </p>
        <ul className="space-y-2">
          {cart.items.map((item) => (
            <li key={item.ean}>
              <a
                href={`https://www.carrefour.fr/s?q=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline"
              >
                {item.title} — {item.price.toFixed(2)}€
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
