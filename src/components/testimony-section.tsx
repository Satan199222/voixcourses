import Image from "next/image";

export function TestimonySection() {
  return (
    <section
      className="py-24 lg:py-28"
      style={{ background: "var(--accent-ink)", color: "var(--text-on-ink)" }}
    >
      <div className="max-w-[1200px] mx-auto px-10 grid gap-16 items-center lg:grid-cols-2">
        <div>
          <span className="vc-eyebrow" style={{ color: "var(--brass)" }}>
            Ils utilisent VoixCourses
          </span>
          <blockquote
            className="text-[28px] leading-[1.35] font-normal mt-6"
            style={{ letterSpacing: "-0.4px" }}
          >
            <Quote />
            Avant, je devais attendre ma fille pour faire les courses le samedi. Maintenant je les
            fais seule, en trois minutes, quand je veux. J&apos;ai retrouvé un pan entier de mon
            autonomie.
            <Quote close />
          </blockquote>
          <cite className="block mt-7 not-italic text-base" style={{ color: "var(--text-on-ink-muted)" }}>
            <strong
              className="block text-[17px] mb-0.5"
              style={{ color: "var(--text-on-ink)", fontWeight: 700 }}
            >
              Marie-Thérèse, 67 ans
            </strong>
            Non-voyante depuis 12 ans · Strasbourg
          </cite>
        </div>

        <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
          <Image
            src="/images/femme-cuisine.jpg"
            alt="Femme utilisant VoixCourses dans sa cuisine"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(13,27,42,0.5) 0%, transparent 50%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function Quote({ close = false }: { close?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        color: "var(--brass)",
        fontSize: 60,
        lineHeight: 0,
        verticalAlign: close ? "-28px" : "-20px",
        marginLeft: close ? 2 : 0,
        marginRight: close ? 0 : 4,
      }}
    >
      {close ? "»" : "«"}
    </span>
  );
}
