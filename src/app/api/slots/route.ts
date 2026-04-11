import { NextRequest, NextResponse } from "next/server";
import { getFirstSlot } from "@/lib/carrefour/client";

export async function GET(request: NextRequest) {
  const storeRef = request.nextUrl.searchParams.get("storeRef");
  if (!storeRef) {
    return NextResponse.json({ error: "storeRef requis" }, { status: 400 });
  }

  const slot = await getFirstSlot(storeRef);
  return NextResponse.json({ slot });
}
