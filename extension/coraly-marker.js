/**
 * Marqueur injecté sur les pages coraly.fr.
 *
 * Permet à l'app web de détecter si l'extension est installée :
 * - Ajoute `data-coraly-extension` sur <html>
 * - Stocke l'ID de l'extension pour les messages depuis la page
 * - Dispatch un CustomEvent "coraly-extension-ready"
 *
 * Protégé contre "Extension context invalidated" : si l'extension a été
 * rechargée pendant que l'onglet était ouvert, `chrome.runtime.getManifest()`
 * throw. On sort silencieusement — le prochain load de la page ré-injectera.
 */
(function () {
  try {
    if (!chrome?.runtime?.id) return;
    const manifest = chrome.runtime.getManifest();

    document.documentElement.dataset.coralyExtension = manifest.version;
    document.documentElement.dataset.coralyExtensionId = chrome.runtime.id;

    window.dispatchEvent(
      new CustomEvent("coraly-extension-ready", {
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
