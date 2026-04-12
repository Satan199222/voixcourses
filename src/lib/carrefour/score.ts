import type { CarrefourProduct } from "./types";

interface ScoreContext {
  /** Quantité cherchée si précisée par l'utilisateur (ex: 2 pour "2 litres") */
  targetQuantity?: number;
  /** Unité cherchée ("L", "kg", "g"…) pour matcher le format */
  targetUnit?: string;
  /** Régime / contraintes : les produits qui les respectent sont remontés */
  diet?: string[];
  /** Marque préférée si l'utilisateur l'a mentionnée */
  brand?: string;
}

/**
 * Calcule un score de pertinence pour un produit Carrefour par rapport à une
 * requête. Utilisé pour trier les 5 premiers résultats : les résultats de
 * l'API retournent parfois le meilleur match en 3e position.
 *
 * Logique volontairement simple : chaque critère rapporte des points. Pas de
 * ML — on veut rester prédictible pour l'utilisateur qui refait plusieurs
 * fois la même dictée.
 */
export function scoreProduct(
  product: CarrefourProduct,
  query: string,
  ctx: ScoreContext = {}
): number {
  let score = 0;
  const qLower = query.toLowerCase();
  const titleLower = product.title.toLowerCase();
  const tokens = qLower
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // 1. Match texte : chaque token de la query présent dans le titre = +3
  for (const token of tokens) {
    if (titleLower.includes(token)) score += 3;
  }

  // 2. Respect du régime : +10 si les mots-clés du régime sont dans le titre
  //    (ex: "sans gluten" → produit avec "sans gluten" dans title gagne gros)
  if (ctx.diet && ctx.diet.length > 0) {
    for (const d of ctx.diet) {
      const normalized = d.replace(/-/g, " ").toLowerCase();
      if (titleLower.includes(normalized)) score += 10;
    }
  }

  // 3. Match marque : +5 si la marque correspond
  if (ctx.brand && product.brand) {
    if (product.brand.toLowerCase().includes(ctx.brand.toLowerCase())) {
      score += 5;
    }
  }

  // 4. Match quantité/format : extraire "2L", "500g" etc. du titre
  //    et comparer avec la cible. +4 si exact.
  if (ctx.targetQuantity && ctx.targetUnit) {
    const format = product.format?.toLowerCase() ?? "";
    const pack = product.packaging?.toLowerCase() ?? "";
    const haystack = `${format} ${pack} ${titleLower}`;
    const needle = `${ctx.targetQuantity}${ctx.targetUnit.toLowerCase()}`;
    if (haystack.includes(needle)) score += 4;
  }

  // 5. Disponibilité : produit non-disponible = pénalité lourde
  if (!product.purchasable) score -= 20;

  // 6. Nutriscore : léger bonus pour les meilleurs (A > B > C)
  //    Priorité faible mais utile en cas d'égalité.
  if (product.nutriscore === "A") score += 1;
  if (product.nutriscore === "B") score += 0.5;

  return score;
}

/**
 * Trie une liste de produits par pertinence décroissante.
 * Stable : préserve l'ordre initial en cas d'égalité.
 */
export function rankProducts(
  products: CarrefourProduct[],
  query: string,
  ctx: ScoreContext = {}
): CarrefourProduct[] {
  return [...products]
    .map((p, i) => ({ p, i, score: scoreProduct(p, query, ctx) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.i - b.i; // stabilité
    })
    .map(({ p }) => p);
}
