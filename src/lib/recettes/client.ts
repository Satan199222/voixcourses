/**
 * Client API VoixRecettes
 *
 * Stratégie (GROA-253/254) :
 *   - Si SPOONACULAR_API_KEY est défini → Spoonacular (meilleure couverture FR avec clé)
 *   - Sinon → TheMealDB free tier (28 recettes cuisine française, sans clé)
 *
 * Toutes les fonctions retournent des types unifiés (RecipeSummary, Recipe).
 * GROA-254 — Phase 5b VoixRecettes
 */

import type {
  Recipe,
  RecipeIngredient,
  RecipeSummary,
  RecipeStep,
  SpoonacularRecipeDetail,
  SpoonacularSearchResult,
  MealDbMeal,
  MealDbSearchResponse,
} from "./types";

const TIMEOUT_MS = 12_000;
const SPOON_BASE = "https://api.spoonacular.com";
const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "VoixRecettes/1.0 (GROA-254; +https://voix.ai/)",
    },
    next: { revalidate: 3600 }, // cache 1 h côté Next.js
  });
  if (!res.ok) {
    throw new Error(`[recettes] HTTP ${res.status} — ${url}`);
  }
  return res.json() as Promise<T>;
}

function spoonKey(): string {
  return process.env.SPOONACULAR_API_KEY ?? "";
}

// ---------------------------------------------------------------------------
// Spoonacular helpers
// ---------------------------------------------------------------------------

function spoonSummaryToUnified(r: SpoonacularRecipeDetail): RecipeSummary {
  return {
    id: String(r.id),
    title: r.title,
    imageUrl: r.image,
    category: r.dishTypes?.[0],
    area: r.cuisines?.[0],
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    source: "spoonacular",
  };
}

function spoonDetailToUnified(r: SpoonacularRecipeDetail): Recipe {
  const ingredients: RecipeIngredient[] = (r.extendedIngredients ?? []).map(
    (ing) => ({
      name: ing.name ?? ing.original ?? "?",
      amount: ing.original ?? `${ing.amount ?? ""} ${ing.unit ?? ""}`.trim(),
    })
  );

  const steps: RecipeStep[] = [];
  for (const block of r.analyzedInstructions ?? []) {
    for (const s of block.steps ?? []) {
      steps.push({ number: s.number, text: s.step });
    }
  }

  // Fallback : découper les instructions en prose par ". " ou "\n"
  if (steps.length === 0 && r.instructions) {
    const raw = r.instructions.replace(/<[^>]+>/g, ""); // strip HTML
    const parts = raw
      .split(/(?:\.\s+|\n+)/)
      .map((s) => s.trim())
      .filter(Boolean);
    parts.forEach((text, i) => steps.push({ number: i + 1, text }));
  }

  return {
    ...spoonSummaryToUnified(r),
    instructionsRaw: r.instructions?.replace(/<[^>]+>/g, ""),
    steps,
    ingredients,
    sourceUrl: r.sourceUrl,
    tags: r.diets,
  };
}

// ---------------------------------------------------------------------------
// TheMealDB helpers
// ---------------------------------------------------------------------------

function mealToSummary(m: MealDbMeal): RecipeSummary {
  return {
    id: `mdb-${m.idMeal}`,
    title: m.strMeal,
    imageUrl: m.strMealThumb,
    category: m.strCategory,
    area: m.strArea,
    source: "themealdb",
  };
}

function mealToRecipe(m: MealDbMeal): Recipe {
  // Ingrédients : strIngredient1..20 + strMeasure1..20
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? "").trim();
    const measure = (m[`strMeasure${i}`] ?? "").trim();
    if (name) {
      ingredients.push({ name, amount: measure || "q.s." });
    }
  }

  // Étapes : découper strInstructions par saut de ligne ou numéro de liste
  const rawInstructions = m.strInstructions ?? "";
  const paragraphs = rawInstructions
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const steps: RecipeStep[] = paragraphs.map((text, i) => ({
    number: i + 1,
    text,
  }));

  const tags = m.strTags
    ? m.strTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  return {
    ...mealToSummary(m),
    instructionsRaw: rawInstructions,
    steps,
    ingredients,
    sourceUrl: m.strSource,
    tags,
  };
}

// ---------------------------------------------------------------------------
// Public API — search
// ---------------------------------------------------------------------------

/**
 * Recherche de recettes par terme.
 * Utilise Spoonacular si SPOONACULAR_API_KEY est défini, TheMealDB sinon.
 */
export async function searchRecipes(query: string): Promise<RecipeSummary[]> {
  const key = spoonKey();

  if (key) {
    const url =
      `${SPOON_BASE}/recipes/complexSearch` +
      `?query=${encodeURIComponent(query)}` +
      `&language=fr&number=8&addRecipeInformation=true` +
      `&instructionsRequired=false&apiKey=${key}`;

    const data = await fetchJson<SpoonacularSearchResult>(url);
    return (data.results ?? []).map((r) =>
      spoonSummaryToUnified(r as SpoonacularRecipeDetail)
    );
  }

  // TheMealDB fallback
  const url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`;
  const data = await fetchJson<MealDbSearchResponse>(url);
  return (data.meals ?? []).map(mealToSummary);
}

// ---------------------------------------------------------------------------
// Public API — detail
// ---------------------------------------------------------------------------

/**
 * Détail complet d'une recette par son identifiant.
 * Les IDs TheMealDB sont préfixés par "mdb-".
 */
export async function getRecipe(id: string): Promise<Recipe> {
  const key = spoonKey();

  if (id.startsWith("mdb-")) {
    const mealId = id.slice(4);
    const url = `${MEALDB_BASE}/lookup.php?i=${encodeURIComponent(mealId)}`;
    const data = await fetchJson<MealDbSearchResponse>(url);
    const meal = data.meals?.[0];
    if (!meal) throw new Error(`[recettes] Recette introuvable : ${id}`);
    return mealToRecipe(meal);
  }

  if (!key) {
    throw new Error(
      "[recettes] SPOONACULAR_API_KEY requis pour les IDs Spoonacular."
    );
  }

  const url =
    `${SPOON_BASE}/recipes/${encodeURIComponent(id)}/information` +
    `?includeNutrition=false&apiKey=${key}`;
  const data = await fetchJson<SpoonacularRecipeDetail>(url);
  return spoonDetailToUnified(data);
}
