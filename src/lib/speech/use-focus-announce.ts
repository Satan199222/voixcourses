"use client";

import { useEffect } from "react";

/**
 * Annonce vocale au focus.
 *
 * Quand `enabled` est true, écoute les événements `focusin` sur le document
 * et lit à voix haute le contenu de chaque élément focusé.
 *
 * Stratégie :
 * - Pour <button>, <a>, <input>, <select>, <textarea> : utilise aria-label
 *   ou aria-labelledby ou textContent
 * - Pour les containers (article, section) : utilise aria-label ou la
 *   première heading enfant
 * - Évite de répéter le même message deux fois de suite
 *
 * Note : ce hook est OPT-IN. Il est désactivé par défaut pour ne pas
 * interférer avec les lecteurs d'écran (qui font déjà ce travail).
 */
export function useFocusAnnounce(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let lastAnnouncement = "";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function announce(text: string) {
      if (!text.trim() || text === lastAnnouncement) return;
      if (!window.speechSynthesis) return;

      lastAnnouncement = text;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }

    function getElementText(el: HTMLElement): string {
      // 1. aria-label direct
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel;

      // 2. aria-labelledby
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.textContent?.trim() || "";
      }

      // 3. associated <label> for inputs
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const labels = (el as HTMLInputElement).labels;
        if (labels && labels.length > 0) {
          return labels[0].textContent?.trim() || "";
        }
      }

      // 4. textContent (limité à 200 caractères)
      const text = el.textContent?.trim() || "";
      return text.slice(0, 200);
    }

    function handleFocus(e: FocusEvent) {
      const target = e.target as HTMLElement;
      if (!target || !(target instanceof HTMLElement)) return;

      // Debounce 100ms pour grouper les changements rapides
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const text = getElementText(target);
        if (text) announce(text);
      }, 100);
    }

    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [enabled]);
}
