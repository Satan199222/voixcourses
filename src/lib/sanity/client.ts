/**
 * Client Sanity — VoixCourses blog auto-généré.
 *
 * TODO GROA-122 : remplacer les stubs par le vrai client Sanity une fois que
 * SANITY_PROJECT_ID et SANITY_API_TOKEN sont disponibles dans Doppler/Vercel env.
 *
 * Installation prévue :
 *   pnpm add @sanity/client @portabletext/react
 *
 * Config attendue :
 *   SANITY_PROJECT_ID=<id>
 *   SANITY_DATASET=production
 *   SANITY_API_TOKEN=<write-token>  (utilisé uniquement côté cron)
 */

/** Modèle d'un article de blog tel que stocké dans Sanity. */
export interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt: string;
  /** Corps de l'article en Portable Text (array) — sérialisé en HTML côté client */
  body: unknown[];
  topicId: number;
  topicSlug: string;
  category: "accessibilite" | "formation" | "technologie" | "pratique";
  /** Temps de lecture estimé en minutes */
  readingTimeMinutes: number;
  organizationId: "voixcourses";
}

// ---------------------------------------------------------------------------
// Stub — ces fonctions retournent des données vides jusqu'à GROA-122.
// Remplacer par les vraies requêtes GROQ une fois Sanity configuré.
// ---------------------------------------------------------------------------

/**
 * Récupère tous les articles publiés, triés par date décroissante.
 * Utilisé par /blog (Server Component, ISR).
 */
export async function getAllPosts(): Promise<SanityPost[]> {
  // TODO GROA-122 :
  // const client = createClient({ projectId: process.env.SANITY_PROJECT_ID, dataset: 'production', apiVersion: '2024-01-01', useCdn: true });
  // return client.fetch(`*[_type == "post" && organizationId == "voixcourses"] | order(publishedAt desc) { _id, title, slug, publishedAt, excerpt, topicId, topicSlug, category, readingTimeMinutes }`);
  return [];
}

/**
 * Récupère un article par son slug.
 * Utilisé par /blog/[slug] (Server Component, ISR).
 */
export async function getPostBySlug(slug: string): Promise<SanityPost | null> {
  // TODO GROA-122 :
  // const client = createClient({ ... });
  // return client.fetch(`*[_type == "post" && slug.current == $slug && organizationId == "voixcourses"][0]{ ..., body }`, { slug });
  void slug;
  return null;
}

/**
 * Publie un article généré par le cron.
 * Utilisé par /api/cron/generate-blog (route handler).
 *
 * @returns L'ID Sanity de l'article créé.
 */
export async function publishPost(
  post: Omit<SanityPost, "_id">
): Promise<string> {
  // TODO GROA-122 :
  // const client = createClient({ projectId: process.env.SANITY_PROJECT_ID, dataset: 'production', apiVersion: '2024-01-01', token: process.env.SANITY_API_TOKEN });
  // const result = await client.create({ _type: 'post', ...post });
  // return result._id;
  void post;
  throw new Error(
    "[sanity] publishPost: Sanity non configuré — attendre GROA-122 (SANITY_PROJECT_ID + SANITY_API_TOKEN)"
  );
}
