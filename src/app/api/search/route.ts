import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/carrefour/client";
import { rankProducts } from "@/lib/carrefour/score";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q requis" }, { status: 400 });
  }

  // Contexte optionnel pour le reranking. Passé en query string pour rester
  // idempotent et cacheable côté CDN (vs POST).
  const dietParam = request.nextUrl.searchParams.get("diet");
  const brand = request.nextUrl.searchParams.get("brand") ?? undefined;
  const qtyParam = request.nextUrl.searchParams.get("qty");
  const unit = request.nextUrl.searchParams.get("unit") ?? undefined;

  const diet = dietParam ? dietParam.split(",").filter(Boolean) : undefined;
  const targetQuantity = qtyParam ? Number(qtyParam) : undefined;

  try {
    const result = await searchProducts(query);
    const ranked = rankProducts(result.products, query, {
      diet,
      brand,
      targetQuantity: Number.isFinite(targetQuantity) ? targetQuantity : undefined,
      targetUnit: unit,
    });
    return NextResponse.json({ ...result, products: ranked });
  } catch (err) {
    console.error("[search] Carrefour search failed:", err);
    return NextResponse.json(
      { error: "Recherche impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
