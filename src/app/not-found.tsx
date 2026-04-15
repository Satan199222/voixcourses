import Link from "next/link";

/**
 * Page 404 cohérente avec le reste du site. Pas de gadget visuel : un message
 * clair + un lien retour accessible.
 */
export default function NotFound() {
  return (
    <div
      role="main"
      className="max-w-xl mx-auto px-4 py-16 space-y-6 text-center"
    >
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="text-[var(--text-muted)]">
        Cette page n&apos;existe pas ou a été déplacée. Vous pouvez revenir à
        Coraly ou consulter la procédure d&apos;installation de
        l&apos;extension.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold hover:bg-[var(--accent-hover)] transition-colors"
        >
          Retour à Coraly
        </Link>
        <Link
          href="/installer"
          className="inline-block px-6 py-3 rounded-lg border-2 border-[var(--border)] text-[var(--text)] font-semibold hover:border-[var(--accent)] transition-colors"
        >
          Installer l&apos;extension
        </Link>
      </div>
    </div>
  );
}
