"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AccessibilityBar } from "@/lib/shared/components/accessibility-bar";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { HelpDialog } from "@/components/help-dialog";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { getAllPosts, type SanityPost } from "@/lib/sanity/client";

const CATEGORY_LABELS: Record<SanityPost["category"], string> = {
  accessibilite: "Accessibilité",
  formation: "Formation",
  technologie: "Technologie",
  pratique: "Pratique",
};

/**
 * Page /blog — Liste des articles auto-générés VoixCourses.
 *
 * Les données proviennent de Sanity (stub vide jusqu'à GROA-122).
 * WCAG AAA : heading order, contraste, aria-labels.
 */
export default function BlogPage() {
  useDocumentTitle("Blog — VoixCourses");

  const [helpOpen, setHelpOpen] = useState(false);
  const [posts, setPosts] = useState<SanityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPosts()
      .then(setPosts)
      .catch((err) => {
        console.error("[blog] Erreur chargement articles:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AccessibilityBar onHelpRequest={() => setHelpOpen(true)} />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section
          className="py-16 lg:py-20 border-b"
          aria-labelledby="blog-title"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-[900px] mx-auto px-10">
            <span className="vc-eyebrow">Blog · Accessibilité &amp; Formation</span>
            <h1
              id="blog-title"
              className="vc-h1 mt-4 mb-4"
              style={{ color: "var(--text)" }}
            >
              Ressources pour apprendre autrement
            </h1>
            <p
              className="text-[18px] leading-[1.7] max-w-[640px]"
              style={{ color: "var(--text-soft)" }}
            >
              Conseils pratiques, guides accessibilité et actualités sur la
              formation en ligne pour les personnes malvoyantes, non-voyantes
              et seniors.
            </p>
          </div>
        </section>

        {/* ── Articles ──────────────────────────────────────────── */}
        <section
          aria-labelledby="articles-title"
          className="py-16 lg:py-20"
        >
          <div className="max-w-[1100px] mx-auto px-10">
            <h2 id="articles-title" className="sr-only">
              Liste des articles
            </h2>

            {loading && (
              <p
                aria-live="polite"
                aria-busy="true"
                className="text-[16px]"
                style={{ color: "var(--text-muted)" }}
              >
                Chargement des articles…
              </p>
            )}

            {!loading && posts.length === 0 && (
              <div
                className="text-center py-20"
                role="status"
                aria-label="Aucun article disponible pour le moment"
              >
                <p
                  className="text-[18px] mb-2"
                  style={{ color: "var(--text-soft)" }}
                >
                  Les premiers articles arrivent bientôt.
                </p>
                <p
                  className="text-[15px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Le blog est publié chaque mercredi. Revenez la semaine
                  prochaine !
                </p>
              </div>
            )}

            {!loading && posts.length > 0 && (
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 list-none">
                {posts.map((post) => (
                  <li key={post._id}>
                    <article
                      className="h-full flex flex-col rounded-xl border overflow-hidden"
                      style={{
                        background: "var(--bg-card)",
                        borderColor: "var(--border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      {/* Catégorie */}
                      <div className="px-6 pt-6 pb-0">
                        <span
                          className="text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: "var(--accent)", letterSpacing: "2px" }}
                          aria-label={`Catégorie : ${CATEGORY_LABELS[post.category]}`}
                        >
                          {CATEGORY_LABELS[post.category]}
                        </span>
                      </div>

                      {/* Contenu principal */}
                      <div className="flex flex-col flex-1 px-6 pt-3 pb-6">
                        <h3
                          className="text-[17px] font-bold leading-[1.4] mb-3"
                          style={{ color: "var(--text)" }}
                        >
                          <Link
                            href={`/blog/${post.slug.current}`}
                            className="hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
                            style={{ color: "var(--text)" }}
                          >
                            {post.title}
                          </Link>
                        </h3>

                        <p
                          className="text-[14px] leading-[1.6] flex-1 mb-4"
                          style={{ color: "var(--text-soft)" }}
                        >
                          {post.excerpt}
                        </p>

                        <div
                          className="flex items-center justify-between text-[13px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <time dateTime={post.publishedAt}>
                            {new Date(post.publishedAt).toLocaleDateString(
                              "fr-FR",
                              { day: "numeric", month: "long", year: "numeric" }
                            )}
                          </time>
                          <span aria-label={`Temps de lecture : ${post.readingTimeMinutes} minutes`}>
                            {post.readingTimeMinutes} min
                          </span>
                        </div>
                      </div>

                      {/* Lien d'action */}
                      <div
                        className="px-6 pb-5 border-t pt-4"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <Link
                          href={`/blog/${post.slug.current}`}
                          className="text-[14px] font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
                          style={{ color: "var(--accent)" }}
                          aria-label={`Lire l'article : ${post.title}`}
                        >
                          Lire l&apos;article →
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
