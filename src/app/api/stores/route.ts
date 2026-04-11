import { NextRequest, NextResponse } from "next/server";
import {
  findStores,
  setStore,
  getBasketServiceId,
} from "@/lib/carrefour/client";

export async function GET(request: NextRequest) {
  const postalCode = request.nextUrl.searchParams.get("postalCode");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode requis" }, { status: 400 });
  }

  const geoRes = await fetch(
    `https://api.woosmap.com/localities/autocomplete/?key=woos-26fe76aa-ff24-3255-b25b-e1bde7b7a683&input=${postalCode}&components=country:fr`,
    {
      headers: {
        origin: "https://www.carrefour.fr",
        referer: "https://www.carrefour.fr/",
      },
    }
  );
  const geoData = await geoRes.json();
  const location = geoData.localities?.[0]?.location;
  if (!location) {
    return NextResponse.json(
      { error: "Code postal introuvable" },
      { status: 404 }
    );
  }

  const stores = await findStores(location.lat, location.lng, postalCode);
  return NextResponse.json({ stores, location });
}

export async function POST(request: NextRequest) {
  const { storeRef } = await request.json();
  if (!storeRef) {
    return NextResponse.json({ error: "storeRef requis" }, { status: 400 });
  }

  await setStore(storeRef);
  const basketServiceId = await getBasketServiceId(storeRef);

  return NextResponse.json({ ok: true, basketServiceId });
}
