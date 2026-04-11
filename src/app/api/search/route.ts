import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/carrefour/client";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q requis" }, { status: 400 });
  }

  const result = await searchProducts(query);
  return NextResponse.json(result);
}
