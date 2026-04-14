"use client";

import { useState } from "react";
import { AccessibilityBar } from "@/components/accessibility-bar";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { LiveRegion } from "@/components/live-region";
import { HelpDialog } from "@/components/help-dialog";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const PERKS = [
  {
    icon: "🎧",
    title: "Accès prioritaire",
    body: "Vous êtes parmi les premières personnes à tester VoixCourses avant son lancement public. Votre retour façonnera le produit.",
  },
  {
    icon: "♿",
    title: "Partenaires accessibilité",
    body: "Nous co-construisons avec des utilisateurs malvoyants, non-voyants et seniors. Chaque retour est lu, documenté et traité.",
  },
  {
    icon: "🇫🇷",
    title: "Conçu en France",
    body: "Projet 100 % français, développé en Moselle, conforme RGAA AAA et à la Directive Européenne d'Accessibilité 2025.",
  },
  {
    icon: "📞",
    title: "Contact direct",
    body: "Échangez directement avec l'équipe. Pas de ticketing anonyme : vos retours arrivent aux développeurs qui corrigent.",
  },
];

const A11Y_NEEDS = [
  "Malvoyance (basse vision)",
  "Non-voyance (cécité totale)",
  "Surdité ou déficience auditive",
  "Troubles moteurs",
  "Troubles cognitifs / DYS",
  "Senior (65 ans et plus)",
  "Aidant d'une personne concernée",
  "Aucun besoin spécifique",
];

type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * Page /beta — Programme bêta VoixCourses.
 * Présente les avantages du programme et propose un formulaire de candidature
 * qui envoie les soumissions à beta@voixcourses.fr via /api/beta-feedback.
 */
export default function BetaPage() {
  useDocumentTitle("Programme Bêta — VoixCourses");

  const [helpOpen, setHelpOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [a11yNeeds, setA11yNeeds] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState("submitting");
    setErrorMsg("");
    setAnnouncement("Envoi en cours…");

    try {
      const res = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, a11yNeeds, message }),
      });

      if (res.ok) {
        setSubmitState("success");
        setAnnouncement(
          "Candidature envoyée avec succès. Merci de rejoindre la bêta VoixCourses !"
        );
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data as { error?: string }).error ??
          "Une erreur est survenue. Réessayez plus tard.";
        setErrorMsg(msg);
        setSubmitState("error");
        setAnnouncement(`Erreur : ${msg}`);
      }
    } catch (err) {
      console.error("[beta] handleSubmit fetch error:", err);
      const msg = "Erreur réseau. Vérifiez votre connexion et réessayez.";
      setErrorMsg(msg);
      setSubmitState("error");
      setAnnouncement(`Erreur : ${msg}`);
    }
  }

  return (
    <>
      <LiveRegion message={announcement} />
      <AccessibilityBar onHelpRequest={() => setHelpOpen(true)} />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="py-20 lg:py-24" aria-labelledby="beta-hero-title">
          <div className="max-w-[900px] mx-auto px-10 text-center">
            <span className="vc-eyebrow">Programme Bêta · Places limitées</span>
            <h1
              id="beta-hero-title"
              className="vc-h1 mt-5 mb-6"
              style={{ color: "var(--text)" }}
            >
              Rejoignez la bêta
              <br />
              VoixCourses.
            </h1>
            <p
              className="text-[20px] leading-[1.6] max-w-[640px] mx-auto"
              style={{ color: "var(--text-soft)" }}
            >
              Vous utilisez un lecteur d&apos;écran, avez une déficience
              visuelle ou accompagnez une personne concernée ? Aidez-nous à
              construire l&apos;assistant vocal de courses le plus accessible
              de France.
            </p>
          </div>
        </section>

        {/* ── Avantages ─────────────────────────────────────────── */}
        <section
          aria-labelledby="perks-title"
          className="pb-16"
        >
          <div className="max-w-[1100px] mx-auto px-10">
            <h2
              id="perks-title"
              className="vc-h2 text-center mb-12"
              style={{ color: "var(--text)" }}
            >
              Pourquoi rejoindre la bêta ?
            </h2>
            <ul
              className="grid gap-6 sm:grid-cols-2 list-none"
              role="list"
            >
              {PERKS.map((perk) => (
                <li
                  key={perk.title}
                  className="p-8 rounded-xl border"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="text-4xl mb-4" aria-hidden="true">
                    {perk.icon}
                  </div>
                  <h3
                    className="text-[18px] font-bold mb-2"
                    style={{ color: "var(--accent)" }}
                  >
                    {perk.title}
                  </h3>
                  <p
                    className="text-[16px] leading-[1.6]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {perk.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Formulaire / Confirmation ──────────────────────────── */}
        <section
          aria-labelledby="form-title"
          className="pb-24"
        >
          <div
            className="max-w-[680px] mx-auto px-10 py-14 rounded-2xl"
            style={{
              background: "var(--accent-ink)",
              color: "var(--text-on-ink)",
            }}
          >
            {submitState === "success" ? (
              <SuccessMessage />
            ) : (
              <>
                <h2
                  id="form-title"
                  className="vc-h2 mb-3"
                  style={{ color: "var(--text-on-ink)" }}
                >
                  Candidater à la bêta
                </h2>
                <p
                  className="text-[16px] leading-[1.6] mb-10"
                  style={{ color: "var(--text-on-ink-muted)" }}
                >
                  Remplissez ce formulaire. Nous vous recontactons sous 48 h
                  avec vos accès et un guide de démarrage.
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  aria-label="Formulaire de candidature bêta"
                >
                  <div className="flex flex-col gap-6">
                    {/* Nom */}
                    <div>
                      <label
                        htmlFor="beta-name"
                        className="block text-[14px] font-semibold mb-1.5 uppercase"
                        style={{
                          letterSpacing: "1.5px",
                          color: "var(--brass)",
                        }}
                      >
                        Votre prénom ou pseudo
                      </label>
                      <input
                        id="beta-name"
                        type="text"
                        autoComplete="given-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ex. Marie"
                        className="w-full rounded-md px-4 py-3 text-[16px] border-[1.5px] outline-none"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(181,136,66,0.4)",
                          color: "var(--text-on-ink)",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--brass)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor =
                            "rgba(181,136,66,0.4)")
                        }
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="beta-email"
                        className="block text-[14px] font-semibold mb-1.5 uppercase"
                        style={{
                          letterSpacing: "1.5px",
                          color: "var(--brass)",
                        }}
                      >
                        Votre adresse email{" "}
                        <span aria-hidden="true">*</span>
                        <span className="sr-only">(obligatoire)</span>
                      </label>
                      <input
                        id="beta-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.fr"
                        className="w-full rounded-md px-4 py-3 text-[16px] border-[1.5px] outline-none"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(181,136,66,0.4)",
                          color: "var(--text-on-ink)",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--brass)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor =
                            "rgba(181,136,66,0.4)")
                        }
                        aria-required="true"
                      />
                    </div>

                    {/* Besoins a11y */}
                    <div>
                      <label
                        htmlFor="beta-a11y"
                        className="block text-[14px] font-semibold mb-1.5 uppercase"
                        style={{
                          letterSpacing: "1.5px",
                          color: "var(--brass)",
                        }}
                      >
                        Besoin d&apos;accessibilité (facultatif)
                      </label>
                      <select
                        id="beta-a11y"
                        value={a11yNeeds}
                        onChange={(e) => setA11yNeeds(e.target.value)}
                        className="w-full rounded-md px-4 py-3 text-[16px] border-[1.5px] outline-none appearance-none"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(181,136,66,0.4)",
                          color: a11yNeeds
                            ? "var(--text-on-ink)"
                            : "var(--text-on-ink-muted)",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--brass)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor =
                            "rgba(181,136,66,0.4)")
                        }
                      >
                        <option value="">-- Choisir --</option>
                        {A11Y_NEEDS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="beta-message"
                        className="block text-[14px] font-semibold mb-1.5 uppercase"
                        style={{
                          letterSpacing: "1.5px",
                          color: "var(--brass)",
                        }}
                      >
                        Dites-nous en plus{" "}
                        <span aria-hidden="true">*</span>
                        <span className="sr-only">(obligatoire)</span>
                      </label>
                      <textarea
                        id="beta-message"
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Pourquoi souhaitez-vous rejoindre la bêta ? Quel est votre usage des courses en ligne aujourd'hui ?"
                        className="w-full rounded-md px-4 py-3 text-[16px] border-[1.5px] outline-none resize-y"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(181,136,66,0.4)",
                          color: "var(--text-on-ink)",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--brass)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor =
                            "rgba(181,136,66,0.4)")
                        }
                        aria-required="true"
                      />
                    </div>

                    {/* Message d'erreur */}
                    {submitState === "error" && errorMsg && (
                      <p
                        role="alert"
                        className="text-[15px] font-semibold px-4 py-3 rounded-md"
                        style={{
                          background: "rgba(176, 34, 50, 0.18)",
                          color: "#FF8FA3",
                          border: "1px solid rgba(176, 34, 50, 0.4)",
                        }}
                      >
                        {errorMsg}
                      </p>
                    )}

                    {/* Bouton */}
                    <button
                      type="submit"
                      disabled={submitState === "submitting"}
                      className="w-full py-4 rounded-md font-bold text-[16px] transition-opacity disabled:opacity-60"
                      style={{
                        background: "var(--brass)",
                        color: "var(--accent-ink)",
                        letterSpacing: "0.3px",
                      }}
                      aria-disabled={submitState === "submitting"}
                    >
                      {submitState === "submitting"
                        ? "Envoi en cours…"
                        : "Envoyer ma candidature"}
                    </button>

                    <p
                      className="text-[13px] text-center"
                      style={{ color: "var(--text-on-ink-faint)" }}
                    >
                      Vos données sont utilisées uniquement pour vous
                      recontacter dans le cadre du programme bêta. Aucune
                      revente, aucun démarchage commercial.
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

function SuccessMessage() {
  return (
    <div className="text-center py-8" aria-live="polite">
      <div className="text-6xl mb-6" aria-hidden="true">
        ✅
      </div>
      <h2
        className="vc-h2 mb-4"
        style={{ color: "var(--text-on-ink)" }}
      >
        Candidature envoyée !
      </h2>
      <p
        className="text-[18px] leading-[1.6] max-w-[480px] mx-auto"
        style={{ color: "var(--text-on-ink-muted)" }}
      >
        Merci de rejoindre l&apos;aventure VoixCourses. Nous vous écrirons
        à l&apos;adresse indiquée sous{" "}
        <strong style={{ color: "var(--text-on-ink)" }}>48 heures</strong>{" "}
        avec vos accès et un guide de démarrage.
      </p>
      <p
        className="mt-6 text-[14px]"
        style={{ color: "var(--text-on-ink-faint)" }}
      >
        Une question ? Écrivez-nous directement à{" "}
        <a
          href="mailto:beta@voixcourses.fr"
          className="underline"
          style={{ color: "var(--brass)" }}
        >
          beta@voixcourses.fr
        </a>
      </p>
    </div>
  );
}
