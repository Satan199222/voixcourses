import { NextRequest, NextResponse } from "next/server";
import { getFirstSlot } from "@/lib/carrefour/client";

export async function GET(request: NextRequest) {
  const storeRef = request.nextUrl.searchParams.get("storeRef");
  if (!storeRef) {
    return NextResponse.json({ error: "storeRef requis" }, { status: 400 });
  }

  try {
    const slot = await getFirstSlot(storeRef);
    return NextResponse.json({ slot });
  } catch (err) {
    console.error("[slots] getFirstSlot failed:", err);
    return NextResponse.json(
      { error: "Lecture du créneau impossible.", slot: null },
      { status: 502 }
    );
  }
}
