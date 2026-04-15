"use client";

import { useState } from "react";
import type { Cart, DeliverySlot } from "@/lib/carrefour/types";
import {
  useExtension,
  sendListToExtension,
} from "@/lib/extension/use-extension";

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
 * Deux scénarios :
 * 1. Extension installée (chemin principal) — envoi en 1 clic via message
 *    sécurisé externally_connectable, l'extension ouvre Carrefour et remplit
 *    le panier avec les cookies de l'utilisateur.
 * 2. Pas d'extension — on invite à installer, et on fournit une liste
 *    manuelle (liens directs Carrefour) pour les cas où l'install n'est
 *    pas possible immédiatement.
 */
export function CartHandoff({
  cart,
  slot,
  storeRef,
  basketServiceId,
}: CartHandoffProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const extension = useExtension();

  if (!cart || cart.items.length === 0) return null;

  async function handleSendToExtension() {
    if (!extension.extensionId) return;
    setSending(true);
    setSendStatus(null);

    const result = await sendListToExtension(extension.extensionId, {
      storeRef,
      basketServiceId,
      items: cart!.items.map((i) => ({
        ean: i.ean,
        quantity: i.quantity || 1,
        title: i.title,
        price:
          i.quantity && i.quantity > 0 ? i.price / i.quantity : i.price,
      })),
      title: `${cart!.items.length} produit${cart!.items.length > 1 ? "s" : ""} · ${cart!.totalAmount.toFixed(2)}€`,
      returnUrl: typeof window !== "undefined" ? window.location.origin : undefined,
    });

    setSending(false);
    if (result.ok) {
      setSent(true);
      setSendStatus(
        `Liste envoyée à l'extension. Un nouvel onglet Carrefour s'est ouvert — cliquez sur le bouton "Remplir mon panier" en haut de la page.`
      );
    } else {
      setSendStatus(`Erreur : ${result.error || "impossible d'envoyer la liste"}`);
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

      {/* Chemin principal : extension installée */}
      {extension.installed && (
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--success)]">
          <h3 className="text-lg font-bold mb-3 text-[var(--success)]">
            ✓ Extension Coraly détectée
          </h3>
          <p className="mb-4">
            Envoyez votre liste en un clic — l&apos;extension ouvre Carrefour et
            vous propose un bouton pour remplir votre panier.
          </p>

          <button
            type="button"
            onClick={handleSendToExtension}
            disabled={sending || sent}
            aria-label={
              sent
                ? "Liste déjà envoyée à l'extension"
                : `Envoyer ${cart.items.length} produit${cart.items.length > 1 ? "s" : ""} à l'extension Coraly pour remplir le panier Carrefour`
            }
            className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-colors ${
              sent
                ? "bg-[var(--success)] text-[var(--bg)] cursor-default"
                : "bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            }`}
          >
            {sent
              ? "✓ Liste envoyée à l'extension"
              : sending
                ? "Envoi en cours..."
                : `Envoyer à Carrefour (${cart.items.length} produit${cart.items.length > 1 ? "s" : ""})`}
          </button>

          {sendStatus && (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-sm"
            >
              {sendStatus}
            </p>
          )}
        </div>
      )}

      {/* Pas d'extension : on invite à l'installer */}
      {!extension.installed && (
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border-2 border-[var(--accent)]">
          <h3 className="text-lg font-bold mb-3">
            Installez l&apos;extension Coraly
          </h3>
          <p className="text-[var(--text-muted)] mb-4">
            Pour remplir votre panier Carrefour automatiquement,
            l&apos;extension Coraly est nécessaire. Elle agit dans votre
            propre session — vos identifiants ne transitent jamais par
            Coraly. Installation en 30 secondes.
          </p>
          <a
            href="/installer"
            className="inline-block px-6 py-4 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-lg hover:bg-[var(--accent-hover)] transition-colors"
            aria-label="Voir la procédure d'installation de l'extension Coraly"
          >
            Installer l&apos;extension →
          </a>
        </div>
      )}

      {/* Fallback ultime : liste manuelle (si pas d'extension et pas envie de l'installer) */}
      <details className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
        <summary className="cursor-pointer font-semibold">
          Pas envie d&apos;installer ? Voir la liste avec liens directs
        </summary>
        <p className="text-sm text-[var(--text-muted)] mt-3 mb-3">
          Cliquez sur chaque produit pour ouvrir sa fiche sur carrefour.fr et
          l&apos;ajouter au panier manuellement. Plus long mais fonctionne sans
          extension.
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
