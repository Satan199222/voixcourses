import { NextRequest, NextResponse } from "next/server";
import { parseGroceryList, type ParseContext } from "@/lib/ai/parse-grocery-list";

export async function POST(request: NextRequest) {
  let body: { text?: string; context?: ParseContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const text = body.text;
  if (!text?.trim()) {
    return NextResponse.json({ error: "text requis" }, { status: 400 });
  }

  try {
    const items = await parseGroceryList(text, body.context ?? {});
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[parse-list] Claude parsing failed:", err);
    return NextResponse.json(
      { error: "Analyse de la liste impossible. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
