"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" colore le bouton de confirmation en rouge (pour action destructive). */
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Dialog de confirmation accessible — remplace `window.confirm()` qui produit
 * un dialog OS non-stylé et mal supporté par certains lecteurs d'écran.
 *
 * Pattern : focus trap, aria-modal, Escape ferme, Enter confirme.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus par défaut sur "Annuler" (option sûre) à l'ouverture.
  useEffect(() => {
    if (!open) return;
    setTimeout(() => cancelBtnRef.current?.focus(), 50);
  }, [open]);

  // Focus trap + touches Escape/Enter
  useEffect(() => {
    if (!open) return;

    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-[var(--danger)] text-white hover:brightness-110"
      : "bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="max-w-md w-full bg-[var(--bg-surface)] border-2 border-[var(--accent)] rounded-xl p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-xl font-bold mb-2">
          {title}
        </h2>
        <p id="confirm-message" className="text-[var(--text-muted)] mb-5">
          {message}
        </p>
        <div className="flex gap-3 justify-end flex-wrap">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border-2 border-[var(--border)] text-[var(--text)] font-semibold hover:border-[var(--accent)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
