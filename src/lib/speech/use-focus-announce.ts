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

    /**
     * Améliorer la prononciation française :
     * - "1.26€" → "1 euros 26 centimes"
     * - "1L" → "1 litre"
     * - "500g" → "500 grammes"
     */
    function preparePronunciation(text: string): string {
      return text
        // Prix par unité : "1,26 € / KG" → "1 euros 26 centimes par kilogramme"
        .replace(
          /(\d+)[.,](\d{2})\s*€\s*\/\s*KG\b/gi,
          "$1 euros $2 centimes par kilogramme"
        )
        .replace(/(\d+)\s*€\s*\/\s*KG\b/gi, "$1 euros par kilogramme")
        .replace(
          /(\d+)[.,](\d{2})\s*€\s*\/\s*L\b/g,
          "$1 euros $2 centimes par litre"
        )
        .replace(/(\d+)\s*€\s*\/\s*L\b/g, "$1 euros par litre")
        // Prix simples
        .replace(/(\d+)[.,](\d{2})\s*€/g, "$1 euros $2 centimes")
        .replace(/(\d+)\s*€/g, "$1 euros")
        // Unités
        .replace(/(\d+(?:[.,]\d+)?)\s*L\b/g, "$1 litres")
        .replace(/(\d+(?:[.,]\d+)?)\s*kg\b/gi, "$1 kilogrammes")
        .replace(/(\d+(?:[.,]\d+)?)\s*g\b/g, "$1 grammes")
        .replace(/(\d+)\s*cl\b/g, "$1 centilitres")
        .replace(/(\d+)\s*ml\b/g, "$1 millilitres");
    }

    function announce(text: string) {
      const cleaned = preparePronunciation(text.trim());
      if (!cleaned || cleaned === lastAnnouncement) return;
      if (!window.speechSynthesis) return;

      lastAnnouncement = cleaned;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = "fr-FR";
      utterance.rate = 1.1;

      // Préférer une voix française si disponible
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

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
