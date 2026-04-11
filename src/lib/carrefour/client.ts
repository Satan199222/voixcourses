import { browserFetch, getPage } from "./browser";
import type {
  CarrefourProduct,
  SearchResult,
  CarrefourStore,
  DeliverySlot,
  Cart,
  CartItem,
} from "./types";

/**
 * Extraire un CarrefourProduct depuis la réponse JSON:API brute.
 * Ref: docs/CARREFOUR-API.md § "Structure Product"
 */
function extractProduct(raw: any): CarrefourProduct {
  const a = raw.attributes;
  const ean: string = a.ean;
  const offers = a.offers?.[ean] || {};
  const [offerServiceId, offerData] = Object.entries(offers)[0] || [
    null,
    null,
  ];
  const offer = (offerData as any)?.attributes;

  return {
    ean,
    title: a.title,
    brand: a.brand,
    slug: a.slug,
    price: offer?.price?.price ?? null,
    perUnitLabel: offer?.price?.perUnitLabel ?? null,
    unitOfMeasure: offer?.price?.unitOfMeasure ?? null,
    purchasable: offer?.availability?.purchasable ?? false,
    nutriscore: a.nutriscore?.value ?? null,
    format: a.format ?? null,
    packaging: a.packaging ?? null,
    categories: a.categories?.map((c: any) => c.label) ?? [],
    imageUrl: a.images?.main ?? null,
    offerServiceId: offerServiceId as string | null,
  };
}

function parseCartResponse(data: any): Cart {
  const cart = data.cart || {};
  const items: CartItem[] = [];
  for (const category of cart.items || []) {
    for (const p of category.products || []) {
      items.push({
        ean: p.product?.attributes?.ean ?? "",
        title: p.product?.attributes?.title ?? "",
        brand: p.product?.attributes?.brand ?? "",
        quantity: p.counter ?? 0,
        price: p.totalItemPrice ?? 0,
        available: p.available ?? true,
      });
    }
  }
  return {
    totalAmount: cart.totalAmount ?? 0,
    totalFees: cart.totalFees ?? 0,
    items,
  };
}

/** Recherche produits. Ref: GET /s?q={query} */
export async function searchProducts(query: string): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query });
  const data = await browserFetch<any>(`/s?${params}`);
  return {
    products: (data.data || []).map(extractProduct),
    total: data.meta?.total ?? 0,
    keyword: data.meta?.keyword ?? query,
  };
}

/** Magasins proches. Ref: GET /geoloc */
export async function findStores(
  lat: number,
  lng: number,
  postalCode: string
): Promise<CarrefourStore[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    page: "1",
    limit: "5",
    postal_code: postalCode,
  });
  params.append("array_postal_codes[]", postalCode);
  params.append("modes[]", "delivery");
  params.append("modes[]", "picking");

  const data = await browserFetch<any>(`/geoloc?${params}`);
  return (data.data?.stores || []).map((s: any) => ({
    ref: s.ref,
    name: s.name,
    format: s.format,
    distance: s.distance,
    isDrive: s.isDrive,
    isDelivery: s.isLad,
    address: s.address,
  }));
}

/** Sélectionner un magasin. Ref: GET /set-store/{ref} */
export async function setStore(storeRef: string): Promise<void> {
  await browserFetch<any>(`/set-store/${storeRef}`);
}

/**
 * Extraire le basketServiceId depuis une fiche produit.
 * Format: XXXX-NNN-{storeRef}. Ref: docs/CARREFOUR-API.md § "Identifiants"
 */
export async function getBasketServiceId(
  storeRef: string
): Promise<string | null> {
  const p = await getPage();
  await p.goto(
    "https://www.carrefour.fr/p/lait-demi-ecreme-uht-vitamine-d-lactel-3252210390014",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await p.waitForTimeout(2000);
  return p.evaluate((ref: string) => {
    const html = document.documentElement.innerHTML;
    const pattern = new RegExp(`[A-Z0-9]{4}-\\d{3}-${ref}`, "g");
    return html.match(pattern)?.[0] || null;
  }, storeRef);
}

/** Lire le panier. Ref: GET /api/cart */
export async function getCart(): Promise<Cart> {
  const data = await browserFetch<any>("/api/cart");
  return parseCartResponse(data);
}

/**
 * Ajouter un produit au panier.
 * Ref: PATCH /api/cart — docs/CARREFOUR-API.md § "Panier — Ajout"
 */
export async function addToCart(
  ean: string,
  basketServiceId: string,
  quantity: number = 1
): Promise<Cart> {
  const body = JSON.stringify({
    trackingRequest: { pageType: "search", pageId: "search" },
    items: [
      {
        basketServiceId,
        counter: quantity,
        ean,
        subBasketType: "drive_clcv",
      },
    ],
  });
  const data = await browserFetch<any>("/api/cart", {
    method: "PATCH",
    body,
    headers: { "content-type": "application/json" },
  });
  return parseCartResponse(data);
}

/** Premier créneau dispo. Ref: GET /api/firstslot */
export async function getFirstSlot(
  storeRef: string
): Promise<DeliverySlot | null> {
  const data = await browserFetch<any>(
    `/api/firstslot?storeId=${storeRef}`
  );
  if (Array.isArray(data) && data.length === 0) return null;
  if (data?.data?.attributes) {
    return {
      begDate: data.data.attributes.begDate,
      endDate: data.data.attributes.endDate,
    };
  }
  return null;
}
