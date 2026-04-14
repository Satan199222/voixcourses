"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { AccessibilityBar } from "@/components/accessibility-bar";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { HelpDialog } from "@/components/help-dialog";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { getPostBySlug, type SanityPost } from "@/lib/sanity/client";

const CATEGORY_LABELS: Record<SanityPost["category"], string> = {
  accessibilite: "Accessibilité",
  formation: "Formation",
  technologie: "Technologie",
  pratique: "Pratique",
};

/**
 * Page /blog/[slug] — Article de blog VoixCourses.
 *
 * Le corps de l'article est rendu en texte simple jusqu'à l'installation de
 * @portabletext/react (GROA-122).
 * WCAG AAA : heading order, contraste, liens de retour, aria-labels.
 */
export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [helpOpen, setHelpOpen] = useState(false);
  const [post, setPost] = useState<SanityPost | null | undefined>(undefined);

  useDocumentTitle(
    post ? `${post.title} — Blog VoixCourses` : "Article — Blog VoixCourses"
  );

  useEffect(() => {
    if (!slug) return;
    getPostBySlug(slug)
      .then((data) => setPost(data))
      .catch((err) => {
        console.error("[blog/slug] Erreur chargement article:", err);
        setPost(null);
      });
  }, [slug]);

  // Article non trouvé
  if (post === null) {
    notFound();
  }

  return (
    <>
      <AccessibilityBar onHelpRequest={() => setHelpOpen(true)} />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {/* Chargement */}
        {post === undefined && (
          <section className="py-24" aria-labelledby="loading-title">
            <div className="max-w-[720px] mx-auto px-10 text-center">
              <p
                aria-live="polite"
                aria-busy="true"
                className="text-[16px]"
                style={{ color: "var(--text-muted)" }}
              >
                Chargement de l&apos;article…
              </p>
            </div>
          </section>
        )}

        {/* Article chargé */}
        {post && (
          <>
            {/* ── Breadcrumb ──────────────────────────────────────── */}
            <nav
              aria-label="Fil d'Ariane"
              className="py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="max-w-[720px] mx-auto px-10">
                <ol className="flex items-center gap-2 text-[13px] list-none flex-wrap">
                  <li>
                    <Link
                      href="/"
                      className="hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
                      style={{ color: "var(--accent)" }}
                    >
                      Accueil
                    </Link>
                  </li>
                  <li aria-hidden="true" style={{ color: "var(--text-muted)" }}>
                    /
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className="hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
                      style={{ color: "var(--accent)" }}
                    >
                      Blog
                    </Link>
                  </li>
                  <li aria-hidden="true" style={{ color: "var(--text-muted)" }}>
                    /
                  </li>
                  <li
                    aria-current="page"
                    className="truncate max-w-[280px]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {post.title}
                  </li>
                </ol>
              </div>
            </nav>

            {/* ── En-tête article ──────────────────────────────────── */}
            <section
              className="pt-12 pb-10 border-b"
              aria-labelledby="article-title"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="max-w-[720px] mx-auto px-10">
                {/* Catégorie */}
                <span
                  className="text-[11px] font-bold uppercase tracking-widest block mb-4"
                  style={{ color: "var(--accent)", letterSpacing: "2px" }}
                  aria-label={`Catégorie : ${CATEGORY_LABELS[post.category]}`}
                >
                  {CATEGORY_LABELS[post.category]}
                </span>

                <h1
                  id="article-title"
                  className="vc-h1 mb-6"
                  style={{ color: "var(--text)" }}
                >
                  {post.title}
                </h1>

                {/* Méta */}
                <div
                  className="flex items-center gap-6 text-[14px] flex-wrap"
                  style={{ color: "var(--text-muted)" }}
                >
                  <time
                    dateTime={post.publishedAt}
                    aria-label={`Publié le ${new Date(post.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
                  >
                    {new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  <span aria-label={`Temps de lecture estimé : ${post.readingTimeMinutes} minutes`}>
                    {post.readingTimeMinutes} min de lecture
                  </span>
                </div>

                {/* Extrait */}
                <p
                  className="mt-6 text-[18px] leading-[1.7] font-medium"
                  style={{ color: "var(--text-soft)" }}
                >
                  {post.excerpt}
                </p>
              </div>
            </section>

            {/* ── Corps de l'article ──────────────────────────────── */}
            <article
              aria-labelledby="article-title"
              className="py-12"
            >
              <div className="max-w-[720px] mx-auto px-10">
                {/*
                 * TODO GROA-122 : remplacer par <PortableText value={post.body} />
                 * une fois @portabletext/react installé et Sanity configuré.
                 * Pour l'instant, rendu des blocs en texte simple.
                 */}
                <div
                  className="prose-voix"
                  style={{ color: "var(--text)" }}
                >
                  {Array.isArray(post.body) &&
                    post.body.map((block: unknown, i: number) => {
                      const b = block as {
                        _type?: string;
                        style?: string;
                        children?: Array<{ text?: string }>;
                      };
                      if (b._type !== "block") return null;
                      const text = (b.children ?? [])
                        .map((c) => c.text ?? "")
                        .join("");
                      if (!text) return null;

                      if (b.style === "h2") {
                        return (
                          <h2
                            key={i}
                            className="text-[22px] font-bold mt-10 mb-4 leading-[1.35]"
                            style={{ color: "var(--text)" }}
                          >
                            {text}
                          </h2>
                        );
                      }
                      if (b.style === "h3") {
                        return (
                          <h3
                            key={i}
                            className="text-[18px] font-bold mt-8 mb-3 leading-[1.4]"
                            style={{ color: "var(--text)" }}
                          >
                            {text}
                          </h3>
                        );
                      }
                      return (
                        <p
                          key={i}
                          className="text-[17px] leading-[1.8] mb-5"
                          style={{ color: "var(--text-soft)" }}
                        >
                          {text}
                        </p>
                      );
                    })}
                </div>
              </div>
            </article>

            {/* ── Pied d'article ──────────────────────────────────── */}
            <section
              className="py-10 border-t"
              aria-label="Navigation article"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="max-w-[720px] mx-auto px-10">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-[15px] font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
                  style={{ color: "var(--accent)" }}
                >
                  ← Retour au blog
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
