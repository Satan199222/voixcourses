import Link from "next/link";

/**
 * Footer global : landmark `<footer>` pour la navigation au lecteur d'écran,
 * liens utiles, et une confirmation que l'app ne collecte rien de sensible.
 */
export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="mt-16 pt-6 pb-8 border-t border-[var(--border)] text-sm text-[var(--text-muted)]"
    >
      <div className="max-w-2xl mx-auto px-4 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <span className="font-semibold text-[var(--text)]">VoixCourses</span>{" "}
          — assistant de courses accessible
        </div>
        <nav aria-label="Liens du pied de page" className="flex gap-4 flex-wrap">
          <Link
            href="/installer"
            className="underline hover:text-[var(--accent)]"
          >
            Installer l&apos;extension
          </Link>
          <a
            href="https://github.com/voixcourses"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--accent)]"
          >
            Code source
          </a>
          <a
            href="mailto:contact@voixcourses.fr"
            className="underline hover:text-[var(--accent)]"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
