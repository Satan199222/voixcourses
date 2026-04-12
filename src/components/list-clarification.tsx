"use client";

import { useState } from "react";
import type { ParsedGroceryItem } from "@/lib/carrefour/types";

interface ListClarificationProps {
  items: ParsedGroceryItem[];
  onUpdate: (index: number, update: Partial<ParsedGroceryItem>) => void;
  onValidate: () => void;
  /** Supprimer un item de la liste (utile si l'utilisateur ne veut plus le chercher) */
  onRemove?: (index: number) => void;
}

export function ListClarification({
  items,
  onUpdate,
  onValidate,
  onRemove,
}: ListClarificationProps) {
  const allClear = items.every((i) => i.status === "clear");

  return (
    <section aria-label="Vérification de la liste">
      <h2 className="text-xl font-bold mb-2">Vérification de votre liste</h2>
      <p className="text-[var(--text-muted)] mb-4">
        {allClear
          ? `${items.length} produits prêts pour la recherche.`
          : `${items.filter((i) => i.status === "clear").length} clairs, ${items.filter((i) => i.status !== "clear").length} à préciser.`}
      </p>

      <ul className="space-y-3" role="list">
        {items.map((item, index) => (
          <ClarificationItem
            key={`${item.originalText}-${index}`}
            item={item}
            index={index}
            total={items.length}
            onUpdate={(update) => onUpdate(index, update)}
            onRemove={onRemove ? () => onRemove(index) : undefined}
          />
        ))}
      </ul>

      <button
        onClick={onValidate}
        disabled={!allClear}
        className="w-full mt-6 px-6 py-4 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-lg disabled:opacity-50 transition-colors"
        aria-label={
          allClear
            ? `Lancer la recherche pour ${items.length} produits`
            : "Précisez tous les produits avant de lancer la recherche"
        }
      >
        {allClear ? "Lancer la recherche" : "Précisez les produits marqués pour continuer"}
      </button>
    </section>
  );
}

interface ClarificationItemProps {
  item: ParsedGroceryItem;
  index: number;
  total: number;
  onUpdate: (update: Partial<ParsedGroceryItem>) => void;
  onRemove?: () => void;
}

/**
 * Item de clarification avec triple fallback pour l'utilisateur :
 * 1. Boutons de suggestions (choix rapide)
 * 2. Champ texte libre "Autre réponse" (indispensable si dictée mal reconnue
 *    ou si aucune suggestion ne correspond)
 * 3. Bouton "Retirer" pour abandonner cet item
 */
function ClarificationItem({
  item,
  index,
  total,
  onUpdate,
  onRemove,
}: ClarificationItemProps) {
  const [customValue, setCustomValue] = useState("");

  const statusLabel =
    item.status === "clear"
      ? "validé"
      : item.status === "ambiguous"
        ? "à préciser"
        : "incompris";

  const normalizedOriginal = item.originalText.trim().toLowerCase();
  const normalizedQuery = (item.query || "").trim().toLowerCase();
  const showQuery =
    item.status === "clear" &&
    item.query &&
    normalizedQuery !== normalizedOriginal;

  const clearItemLabel = `Article ${index + 1} sur ${total}, ${item.originalText}, ${statusLabel}${showQuery ? `, recherche : ${item.query}` : ""}`;

  const borderClass =
    item.status === "clear"
      ? "border-[var(--success)]"
      : item.status === "ambiguous"
        ? "border-[var(--accent)]"
        : "border-[var(--danger)]";

  const iconColor =
    item.status === "clear"
      ? "text-[var(--success)]"
      : item.status === "ambiguous"
        ? "text-[var(--accent)]"
        : "text-[var(--danger)]";

  const icon =
    item.status === "clear" ? "✓" : item.status === "ambiguous" ? "?" : "✗";

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = customValue.trim();
    if (!v) return;
    onUpdate({
      query: v,
      status: "clear",
      clarificationQuestion: undefined,
      suggestions: undefined,
    });
    setCustomValue("");
  }

  const clarifId = `clarif-q-${index}`;
  const customInputId = `clarif-custom-${index}`;

  return (
    <li
      {...(item.status === "clear"
        ? { tabIndex: 0, "aria-label": clearItemLabel }
        : {})}
      className={`p-4 rounded-lg border-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] bg-[var(--bg-surface)] ${borderClass}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`text-lg ${iconColor}`}>
          {icon}
        </span>
        <div className="flex-1">
          <div className="font-semibold">{item.originalText}</div>
          {showQuery && (
            <div className="text-sm text-[var(--text-muted)]">
              Recherche : {item.query}
            </div>
          )}
          {item.clarificationQuestion && (
            <div className="mt-2 font-medium" id={clarifId}>
              {item.clarificationQuestion}
            </div>
          )}

          {item.suggestions && item.suggestions.length > 0 && (
            <div
              className="flex flex-wrap gap-2 mt-2"
              role="group"
              aria-labelledby={clarifId}
            >
              {item.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      query: suggestion,
                      status: "clear",
                      clarificationQuestion: undefined,
                      suggestions: undefined,
                    })
                  }
                  className="px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] text-sm hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors"
                  aria-label={`Pour ${item.originalText}, choisir : ${suggestion}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Champ libre — ESCAPE HATCH critique pour la dictée.
              Si SpeechRecognition a mal reconnu, les suggestions sont
              forcément fausses. L'utilisateur doit pouvoir corriger en texte. */}
          {item.status !== "clear" && (
            <form
              onSubmit={handleCustomSubmit}
              className="flex gap-2 mt-3"
              aria-label={`Correction libre pour ${item.originalText}`}
            >
              <label htmlFor={customInputId} className="sr-only">
                Autre réponse pour {item.originalText}
              </label>
              <input
                id={customInputId}
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Autre réponse…"
                className="flex-1 px-3 py-2 rounded border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={!customValue.trim()}
                className="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg)] text-sm font-semibold disabled:opacity-50"
                aria-label={`Valider la correction pour ${item.originalText}`}
              >
                OK
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label={`Retirer ${item.originalText} de la liste`}
                  className="px-3 py-2 rounded border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  Retirer
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
