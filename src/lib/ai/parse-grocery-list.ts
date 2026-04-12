import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Schéma Zod pour un item de liste de courses parsé par Claude.
 * Utilisé par Output.object() pour garantir la structure de sortie.
 */
const ParsedItemSchema = z.object({
  query: z
    .string()
    .describe(
      "Requête de recherche optimisée pour Carrefour (ex: 'lait demi ecreme 1L')"
    ),
  originalText: z
    .string()
    .describe("Texte brut de l'utilisateur pour ce produit"),
  quantity: z.number().default(1).describe("Quantité demandée"),
  unit: z
    .string()
    .optional()
    .describe("Unité si précisée (L, kg, g, etc.)"),
  brand: z
    .string()
    .optional()
    .describe("Marque si précisée par l'utilisateur"),
  status: z
    .enum(["clear", "ambiguous", "unrecognized"])
    .describe(
      "clear = prêt pour recherche, ambiguous = trop vague, unrecognized = erreur de dictée"
    ),
  clarificationQuestion: z
    .string()
    .optional()
    .describe(
      "Question courte en français si le produit est ambigu (ex: 'Quel type de lait ?')"
    ),
  suggestions: z
    .array(z.string())
    .optional()
    .describe("2 à 4 suggestions si ambigu ou incompris"),
});

const GroceryListSchema = z.object({
  items: z.array(ParsedItemSchema),
});

/** Type inféré depuis le schéma Zod */
export type ParsedGroceryItem = z.infer<typeof ParsedItemSchema>;

/** Contexte utilisateur injecté dans le prompt pour personnaliser le parsing */
export interface ParseContext {
  /** Contraintes alimentaires strictes — seront ajoutées à toutes les queries
   *  (ex: "sans-gluten" → "pâtes" devient "pâtes sans gluten") */
  diet?: string[];
  /** Allergènes à éviter — également ajoutés comme contraintes */
  allergens?: string[];
  /** Préférences par famille : { "lait": "demi-écrémé", "yaourts": "nature" }
   *  Permet de désambiguïser "du lait" → "lait demi-écrémé" automatiquement */
  defaults?: Record<string, string>;
}

/**
 * Parse une liste de courses en langage naturel via Claude (Vercel AI Gateway).
 * Utilise Output.object() pour forcer la sortie structurée — pas de regex.
 *
 * Le contexte utilisateur (régimes, allergies, préférences habituelles) est
 * injecté dans le prompt pour réduire les clarifications répétitives.
 */
export async function parseGroceryList(
  rawText: string,
  context: ParseContext = {}
): Promise<ParsedGroceryItem[]> {
  const contextBlock = buildContextBlock(context);

  const { output } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    output: Output.object({ schema: GroceryListSchema }),
    prompt: `Tu es un assistant qui transforme une liste de courses en français en requêtes de recherche pour Carrefour. L'utilisateur est souvent non-voyant et dicte oralement — ton parsing doit tolérer les hésitations, reprises, et qualificatifs emphatiques.

**Filtrer les mots de liaison et les articles** : ignore "du", "de la", "des", "le", "la", "un", "une", "quelques", "un peu de", "environ", etc. Ne les inclus PAS dans la query.

**Filtrer les qualificatifs oraux vagues et l'emphase** : "du bon beurre", "un super lait", "du beau jambon", "du vrai café". Les adjectifs "bon", "bien", "super", "vrai", "beau", "frais" en langage oral sont souvent de l'emphase et NON une spécification. Réduis au type sous-jacent ("beurre", "lait", "jambon", "café").

**Classer chaque item strictement** :

**"clear"** : le produit est SUFFISAMMENT précis pour une recherche pertinente.
Un item est clear s'il a au moins :
- un type de produit précis (ex: "lait demi-écrémé", "pâtes penne", "beurre doux")
- OU une quantité/poids précis (ex: "2L de lait", "500g de beurre")
Exemples clear : "2 litres de lait demi-écrémé", "pâtes spaghetti Barilla", "beurre doux 250g"

**"ambiguous"** : le produit est TROP VAGUE pour une recherche unique.
DOIT avoir une "clarificationQuestion" et des "suggestions" pertinentes.
Exemples ambiguous :
- "du lait" → question "Quel type de lait ?", suggestions ["demi-écrémé", "entier", "écrémé", "sans lactose"]
- "des pâtes" → question "Quelle forme de pâtes ?", suggestions ["spaghetti", "penne", "coquillettes", "peu importe"]
- "du beurre" → question "Quel type de beurre ?", suggestions ["doux", "demi-sel", "bio", "allégé"]
- "du fromage" → question "Quel fromage ?", suggestions ["emmental râpé", "comté", "camembert", "chèvre"]
- "des yaourts" → question "Quel type de yaourts ?", suggestions ["nature", "aux fruits", "grecs", "bio"]

**"unrecognized"** : le texte ne semble pas être un produit (erreur de dictée, mot manquant).
DOIT proposer des "suggestions" alternatives PHONÉTIQUEMENT proches.
Ex: "passes pen" → suggestions ["pâtes penne", "pâtes", "pastèque"]

**Important** : si la requête contient UNIQUEMENT "du X", "des X", "de la X" sans aucun détail, c'est AMBIGUOUS, pas clear. La recherche Carrefour retournerait trop de produits sans lien entre eux.${contextBlock}

Liste de courses :
${rawText}`,
  });

  const items = output?.items ?? [];

  // Post-process : appliquer les préférences par défaut si présentes.
  // On reclasse en "clear" les items pour lesquels l'utilisateur a déjà
  // tranché dans le passé (ex: toujours "yaourts nature").
  return applyDefaults(items, context.defaults);
}

function buildContextBlock(ctx: ParseContext): string {
  const parts: string[] = [];

  if (ctx.diet && ctx.diet.length > 0) {
    parts.push(
      `\n\n**Régime alimentaire STRICT de l'utilisateur** : ${ctx.diet.join(", ")}.\nTu DOIS ajouter ces contraintes à chaque query quand pertinent (ex: régime "sans-gluten" → "pâtes" devient query "pâtes sans gluten", "pain" devient "pain sans gluten"). Ne classe PAS en "ambiguous" un produit couvert par le régime — complète-le directement.`
    );
  }

  if (ctx.allergens && ctx.allergens.length > 0) {
    parts.push(
      `\n\n**Allergènes à ÉVITER absolument** : ${ctx.allergens.join(", ")}.\nSi un item dicté contient manifestement un allergène (ex: "cacahuètes" alors que l'allergène est "arachide"), marque-le "ambiguous" avec une question d'alerte.`
    );
  }

  if (ctx.defaults && Object.keys(ctx.defaults).length > 0) {
    const pairs = Object.entries(ctx.defaults)
      .map(([k, v]) => `"${k}" → "${v}"`)
      .join(", ");
    parts.push(
      `\n\n**Préférences habituelles de l'utilisateur** (choix passés) : ${pairs}.\nSi l'utilisateur dicte un produit vague qui correspond à une clé (ex: dit "yaourts" et la préférence est "yaourts" → "yaourts nature"), marque "clear" avec la query correspondante AU LIEU de demander clarification. L'utilisateur pourra toujours corriger après.`
    );
  }

  return parts.join("");
}

function applyDefaults(
  items: ParsedGroceryItem[],
  defaults: Record<string, string> | undefined
): ParsedGroceryItem[] {
  if (!defaults || Object.keys(defaults).length === 0) return items;

  return items.map((item) => {
    if (item.status === "clear") return item;

    // Match par mot-clé : si la query ou originalText contient une des clés
    // de préférence, on utilise la valeur comme query finale.
    const haystack = `${item.query} ${item.originalText}`.toLowerCase();
    for (const [key, value] of Object.entries(defaults)) {
      if (haystack.includes(key.toLowerCase())) {
        return {
          ...item,
          query: value,
          status: "clear" as const,
          clarificationQuestion: undefined,
          suggestions: undefined,
        };
      }
    }
    return item;
  });
}
