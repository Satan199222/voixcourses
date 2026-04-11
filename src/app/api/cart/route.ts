import { NextRequest, NextResponse } from "next/server";
import { getCart, addToCart } from "@/lib/carrefour/client";

export async function GET() {
  const cart = await getCart();
  return NextResponse.json(cart);
}

export async function PATCH(request: NextRequest) {
  const { ean, basketServiceId, quantity } = await request.json();
  if (!ean || !basketServiceId) {
    return NextResponse.json(
      { error: "ean et basketServiceId requis" },
      { status: 400 }
    );
  }

  const cart = await addToCart(ean, basketServiceId, quantity ?? 1);
  return NextResponse.json(cart);
}
