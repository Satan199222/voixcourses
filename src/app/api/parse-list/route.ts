import { NextRequest, NextResponse } from "next/server";
import { parseGroceryList } from "@/lib/ai/parse-grocery-list";

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "text requis" }, { status: 400 });
  }

  const items = await parseGroceryList(text);
  return NextResponse.json({ items });
}
