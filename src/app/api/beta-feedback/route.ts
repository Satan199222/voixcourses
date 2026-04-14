import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/beta-feedback
 *
 * Reçoit un formulaire de candidature bêta et transfère par email à
 * beta@voixcourses.fr via l'API Resend.
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY — clé API Resend (https://resend.com)
 *   BETA_FROM_EMAIL — adresse d'expéditeur vérifiée dans Resend
 *                     (défaut : "noreply@voixcourses.fr")
 *
 * En l'absence de RESEND_API_KEY, la soumission est loguée côté serveur
 * et retourne 200 — utile en dev local sans clé.
 */

const BETA_TO = "beta@voixcourses.fr";
const RATE_MAX = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 3 soumissions / heure / IP

interface FeedbackBody {
  name?: string;
  email?: string;
  a11yNeeds?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(
    `beta-feedback:${clientKey(request)}`,
    RATE_MAX,
    RATE_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de soumissions. Réessayez dans une heure." },
      {
        status: 429,
        headers: rateLimitHeaders(RATE_MAX, rl.remaining, rl.resetAt),
      }
    );
  }

  let body: FeedbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const a11yNeeds = body.a11yNeeds?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!email || !message) {
    return NextResponse.json(
      { error: "Les champs email et message sont requis." },
      { status: 422 }
    );
  }

  // Validation email basique
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Adresse email invalide." },
      { status: 422 }
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.BETA_FROM_EMAIL ?? "noreply@voixcourses.fr";

  const subject = `[Beta VoixCourses] Candidature de ${name || email}`;
  const html = `
<h2>Candidature bêta VoixCourses</h2>
<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:15px">
  <tr>
    <th style="text-align:left;padding-right:20px;color:#5E6E78">Nom</th>
    <td>${escapeHtml(name || "(non renseigné)")}</td>
  </tr>
  <tr>
    <th style="text-align:left;padding-right:20px;color:#5E6E78">Email</th>
    <td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
  </tr>
  <tr>
    <th style="text-align:left;padding-right:20px;color:#5E6E78">Besoins a11y</th>
    <td>${escapeHtml(a11yNeeds || "(non renseigné)")}</td>
  </tr>
  <tr>
    <th style="text-align:left;padding-right:20px;color:#5E6E78">Message</th>
    <td style="white-space:pre-wrap">${escapeHtml(message)}</td>
  </tr>
</table>
<p style="color:#5E6E78;font-size:13px;margin-top:24px">
  Soumis le ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
</p>
`;

  if (!resendKey) {
    console.warn(
      "[beta-feedback] RESEND_API_KEY absent — email non envoyé (dev mode).",
      { name, email, a11yNeeds, message: message.slice(0, 80) }
    );
    return NextResponse.json({ ok: true, dev: true });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: BETA_TO,
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[beta-feedback] Resend HTTP", res.status, err.slice(0, 200));
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email. Réessayez plus tard." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[beta-feedback] fetch error:", err);
    return NextResponse.json(
      { error: "Erreur réseau lors de l'envoi. Réessayez plus tard." },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
