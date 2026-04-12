/**
 * Script inline pour appliquer le thème AVANT le premier paint.
 * Évite le FOWT (Flash of Wrong Theme) et le FOUT sur la taille de police.
 *
 * Par défaut (utilisateur qui n'a rien configuré) :
 * - thème sombre (meilleur confort pour les utilisateurs malvoyants sensibles
 *   à la luminosité)
 * - font-size "Grand" (1.3rem) — VoixCourses cible les utilisateurs
 *   non-voyants et malvoyants, la valeur normale (1.125rem) serait trop petite
 *   pour le cas d'usage primaire.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('voixcourses-theme');
    if (t === 'light' || t === 'high-contrast') {
      document.documentElement.classList.add('theme-' + t);
    }
    var s = localStorage.getItem('voixcourses-font-size') || '1.3rem';
    document.documentElement.style.setProperty('--font-size-base', s);
    if (!localStorage.getItem('voixcourses-font-size')) {
      localStorage.setItem('voixcourses-font-size', '1.3rem');
    }
  } catch (e) {}
})();
`.trim();
