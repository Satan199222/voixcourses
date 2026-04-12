"use client";

import { useEffect } from "react";

/**
 * Met à jour `document.title` pour refléter l'étape courante.
 * Aide l'utilisateur multi-onglets à se repérer depuis l'onglet du navigateur,
 * et fournit une info utile aux SR qui lisent le titre à chaque changement.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
