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

Analyse chaque produit et classe-le :
- "clear" : suffisamment précis pour une recherche (ex: "lait demi-écrémé 2L", "pâtes penne Barilla")
- "ambiguous" : trop vague, il manque une info importante (ex: "du lait" → quel type ?, "des pâtes" → quelle forme ?)
- "unrecognized" : erreur probable de dictée vocale ou texte incompréhensible

Pour les items "ambiguous", pose une question courte et propose 2-4 suggestions.
Pour les items "unrecognized", propose 2-4 interprétations possibles.

Liste de courses :
${rawText}`,
  });

  return output?.items ?? [];
}
