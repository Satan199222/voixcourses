/**
 * Marqueur injecté sur les pages voixcourses.fr.
 *
 * Permet à l'app web de détecter si l'extension est installée :
 * - Ajoute `data-voixcourses-extension` sur <html>
 * - Stocke l'ID de l'extension pour les messages depuis la page
 * - Dispatch un CustomEvent "voixcourses-extension-ready"
 *
 * Protégé contre "Extension context invalidated" : si l'extension a été
 * rechargée pendant que l'onglet était ouvert, `chrome.runtime.getManifest()`
 * throw. On sort silencieusement — le prochain load de la page ré-injectera.
 */
(function () {
  try {
    if (!chrome?.runtime?.id) return;
    const manifest = chrome.runtime.getManifest();

    document.documentElement.dataset.voixcoursesExtension = manifest.version;
    document.documentElement.dataset.voixcoursesExtensionId = chrome.runtime.id;

    window.dispatchEvent(
      new CustomEvent("voixcourses-extension-ready", {
        detail: {
          installed: true,
          version: manifest.version,
          extensionId: chrome.runtime.id,
        },
      })
    );
  } catch {
    /* Extension context invalidated — silencieux */
  }
})();
