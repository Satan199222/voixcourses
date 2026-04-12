/**
 * Générateur de bookmarklet pour remplir le panier Carrefour dans la session
 * de l'utilisateur.
 *
 * Le bookmarklet s'exécute sur carrefour.fr (clic depuis la barre de favoris),
 * utilise les cookies de session de l'utilisateur, et appelle PATCH /api/cart
 * pour chaque produit. Résultat : le panier est rempli pour l'utilisateur,
 * pas pour notre serveur.
 *
 * Validé par probes/09-bookmarklet-test.mjs.
 */

export interface BookmarkletPayload {
  storeRef: string;
  basketServiceId: string;
  eans: string[];
}

/**
 * Génère le code JavaScript du bookmarklet.
 * Note : pageType DOIT être "productdetail" — l'API Carrefour valide cette valeur.
 */
export function generateBookmarklet(payload: BookmarkletPayload): string {
  // JSON compact (pas d'espaces superflus) pour raccourcir l'URL
  const data = JSON.stringify(payload);

  const code = `(async()=>{const D=${data};try{await fetch('/set-store/'+D.storeRef,{headers:{'x-requested-with':'XMLHttpRequest'}});for(const e of D.eans){await fetch('/api/cart',{method:'PATCH',headers:{'x-requested-with':'XMLHttpRequest','content-type':'application/json'},body:JSON.stringify({trackingRequest:{pageType:'productdetail',pageId:'productdetail'},items:[{basketServiceId:D.basketServiceId,counter:1,ean:e,subBasketType:'drive_clcv'}]})})}location.href='/mon-panier'}catch(err){alert('Erreur VoixCourses: '+err.message)}})();`;

  return `javascript:${encodeURIComponent(code)}`;
}

/**
 * Version lisible du script (sans minification) — utile pour debug ou
 * afficher à l'utilisateur ce que le bookmarklet va faire.
 */
export function generateReadableScript(payload: BookmarkletPayload): string {
  return `(async () => {
  const DATA = ${JSON.stringify(payload, null, 2)};
  // 1. Sélectionner le même magasin que VoixCourses
  await fetch('/set-store/' + DATA.storeRef, {
    headers: { 'x-requested-with': 'XMLHttpRequest' }
  });
  // 2. Ajouter chaque produit
  for (const ean of DATA.eans) {
    await fetch('/api/cart', {
      method: 'PATCH',
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        trackingRequest: { pageType: 'productdetail', pageId: 'productdetail' },
        items: [{
          basketServiceId: DATA.basketServiceId,
          counter: 1,
          ean,
          subBasketType: 'drive_clcv'
        }]
      })
    });
  }
  // 3. Rediriger vers le panier
  location.href = '/mon-panier';
})();`;
}
