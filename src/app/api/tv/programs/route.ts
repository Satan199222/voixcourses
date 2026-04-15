/**
 * GET /api/tv/programs?date=YYYY-MM-DD
 *
 * Retourne les chaînes TNT actives avec leurs programmes du soir (18:00–00:00)
 * pour la date demandée. Triées par tntNumber croissant.
 *
 * Si le paramètre `date` est absent, utilise la date du jour (Europe/Paris).
 *
 * GROA-223 — Phase 1c VoixTV
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TvChannelDto, TvProgramDto } from "@/lib/tv/types";

export interface TvProgramsResponse {
  date: string; // YYYY-MM-DD
  channels: {
    channel: TvChannelDto;
    programs: TvProgramDto[];
  }[];
}

/** Construit les bornes UTC pour la soirée (18:00–03:00 Paris) d'une date. */
function eveningBounds(dateStr: string): { from: Date; to: Date } {
  // Heure locale Paris — approximation UTC+2 en été, UTC+1 en hiver.
  // On prend une fenêtre large : 16:00 UTC → 02:00 UTC+1 (soit 18:00–03:00 Paris).
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  // from : 16:00 UTC = 18:00 Paris (heure d'hiver / standard)
  const from = new Date(base.getTime() + 16 * 60 * 60 * 1000);
  // to : 02:00 UTC lendemain = 03:00 Paris
  const to = new Date(base.getTime() + 26 * 60 * 60 * 1000);
  return { from, to };
}

/** Date du jour en fuseau Europe/Paris au format YYYY-MM-DD. */
function todayParis(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("/")
    .reverse()
    .join("-");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Résolution de la date
  const rawDate = req.nextUrl.searchParams.get("date");
  const dateStr = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : todayParis();

  const { from, to } = eveningBounds(dateStr);

  try {
    const channels = await prisma.tvChannel.findMany({
      where: { active: true },
      orderBy: { tntNumber: "asc" },
      include: {
        programs: {
          where: {
            startAt: { gte: from, lt: to },
          },
          orderBy: { startAt: "asc" },
        },
      },
    });

    const response: TvProgramsResponse = {
      date: dateStr,
      channels: channels.map((ch) => ({
        channel: {
          id: ch.id,
          sfrEpgId: ch.sfrEpgId,
          name: ch.name,
          tntNumber: ch.tntNumber,
          logoUrl: ch.logoUrl,
          active: ch.active,
        },
        programs: ch.programs.map((p) => ({
          id: p.id,
          channelId: p.channelId,
          title: p.title,
          subtitle: p.subtitle,
          genre: p.genre,
          synopsis: p.synopsis,
          startAt: p.startAt.toISOString(),
          endAt: p.endAt.toISOString(),
          imageUrl: p.imageUrl,
          season: p.season,
          episode: p.episode,
          fetchedAt: p.fetchedAt.toISOString(),
        })),
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[tv/programs] DB error:", err);
    return NextResponse.json(
      { error: "DB unavailable", detail: String(err) },
      { status: 503 }
    );
  }
}
