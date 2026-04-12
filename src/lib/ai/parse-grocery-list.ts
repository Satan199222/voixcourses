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

/**
 * Parse une liste de courses en langage naturel via Claude (Vercel AI Gateway).
 * Utilise Output.object() pour forcer la sortie structurée — pas de regex.
 */
export async function parseGroceryList(
  rawText: string
): Promise<ParsedGroceryItem[]> {
  const { output } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    output: Output.object({ schema: GroceryListSchema }),
    prompt: `Tu es un assistant qui transforme une liste de courses en français en requêtes de recherche pour Carrefour.

**Filtrer les mots de liaison et les articles** : ignore "du", "de la", "des", "le", "la", "un", "une", "quelques", "un peu de", "environ", etc. Ne les inclus PAS dans la query.

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
DOIT proposer des "suggestions" alternatives.

**Important** : si la requête contient UNIQUEMENT "du X", "des X", "de la X" sans aucun détail, c'est AMBIGUOUS, pas clear. La recherche Carrefour retournerait trop de produits sans lien entre eux.

Liste de courses :
${rawText}`,
  });

  return output?.items ?? [];
}
