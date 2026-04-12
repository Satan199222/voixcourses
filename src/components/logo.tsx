interface LogoProps {
  className?: string;
  /** Titre visuellement caché — lu par screen readers */
  title?: string;
}

/**
 * Logo VoixCourses — onde vocale stylisée qui évolue en caddie.
 * SVG inline pour contrôler la couleur via currentColor et éviter une
 * dépendance à un asset externe (zéro requête réseau).
 *
 * aria-hidden par défaut : le H1 "VoixCourses" à côté porte déjà le nom.
 */
export function Logo({ className = "", title }: LogoProps) {
  const ariaProps = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };

  return (
    <svg
      {...ariaProps}
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Onde vocale — 4 barres qui grandissent puis diminuent */}
      <g fill="currentColor">
        <rect x="8" y="26" width="4" height="12" rx="2" opacity="0.55" />
        <rect x="16" y="20" width="4" height="24" rx="2" opacity="0.75" />
        <rect x="24" y="14" width="4" height="36" rx="2" />
      </g>

      {/* Caddie stylisé — triangle + cercles des roues */}
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 20 L58 20 L52 40 L38 40 Z" />
        <path d="M34 20 L32 14" />
      </g>
      <circle cx="40" cy="50" r="3.5" fill="currentColor" />
      <circle cx="52" cy="50" r="3.5" fill="currentColor" />
    </svg>
  );
}
