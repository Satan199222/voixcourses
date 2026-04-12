/**
 * Active la voix VoixCourses sur voixcourses.fr et localhost (dev).
 *
 * Mêmes comportements que sur carrefour.fr :
 * - Message de bienvenue "Appuyez Entrée pour désactiver, Tab pour continuer"
 * - Lecture au focus de chaque élément (bouton, lien, input, etc.)
 * - Raccourci V pour réactiver si désactivée
 * - Préférence user partagée avec carrefour.fr (même clé storage)
 *
 * Protégé contre "Extension context invalidated" : si l'extension a été
 * rechargée, on sort avant de tenter greetIfNeeded (qui read/write storage).
 */
(async function () {
  const api = window.__voixcoursesTTS;
  if (!api) return;
  if (api.isExtensionAlive && !api.isExtensionAlive()) return;

  try {
    api.installFocusSpeaker();
    api.installVoiceToggleShortcut();
    await api.greetIfNeeded("VoixCourses");
  } catch {
    /* context invalidated pendant l'exécution — silencieux */
  }
})();
