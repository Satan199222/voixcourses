import Image from "next/image";

export function WalkthroughDialog() {
  return (
    <section className="py-24 lg:py-28" style={{ background: "var(--bg)" }}>
      <div className="max-w-[1200px] mx-auto px-10">
        <span className="vc-eyebrow">Un exemple concret</span>
        <h2 className="vc-h2 mt-4" style={{ color: "var(--text)" }}>
          Vos mots, votre panier.
        </h2>
        <p className="mt-2 text-[17px] max-w-[640px] mb-12" style={{ color: "var(--text-soft)" }}>
          Ce que vous entendriez à l&apos;oreille et liriez à l&apos;écran pour un produit choisi.
          Chaque échange est annoncé au lecteur d&apos;écran.
        </p>

        <div
          className="rounded-2xl overflow-hidden grid lg:grid-cols-2"
          style={{ border: "1px solid var(--border-hi)", background: "var(--bg-surface)" }}
        >
          {/* Colonne gauche : conversation */}
          <div
            className="p-8 lg:p-10 flex flex-col gap-4"
            style={{ borderRight: "1px solid var(--border)" }}
          >
            <div className="vc-micro mb-2" style={{ color: "var(--text-muted)" }}>
              Échange vocal
            </div>
            <Bubble who="Koraly">Que puis-je ajouter à votre panier&nbsp;?</Bubble>
            <Bubble who="Vous">Des pommes Golden, un kilo.</Bubble>
            <Bubble who="Koraly">
              J&apos;ai trouvé 5 propositions. La première&nbsp;: Pommes Golden, sachet 1&nbsp;kg,
              2,89&nbsp;€ chez Carrefour. Je valide&nbsp;?
            </Bubble>
            <ProductBubble />
            <Bubble who="Vous">Oui, parfait.</Bubble>
            <Bubble who="Koraly">Ajouté. Produit suivant&nbsp;?</Bubble>
          </div>

          {/* Colonne droite : résultat */}
          <div className="p-8 lg:p-10 flex flex-col gap-8">
            <div className="vc-micro" style={{ color: "var(--text-muted)" }}>
              Résultat dans le panier
            </div>

            <div
              className="rounded-xl p-5 flex items-center gap-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <Image
                  src="/images/pomme-golden.jpg"
                  alt="Pommes Golden"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate" style={{ color: "var(--text)" }}>
                  Pommes Golden, sachet 1&nbsp;kg
                </div>
                <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Carrefour · 2,89&nbsp;€ · Nutriscore&nbsp;A
                </div>
                <div
                  className="text-sm mt-1.5 font-bold"
                  style={{ color: "var(--success)" }}
                >
                  ✓ Ajouté au panier
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-auto">
              {[
                { n: "3 min", label: "pour faire ses courses" },
                { n: "5", label: "propositions triées" },
                { n: "100%", label: "vocal & clavier" },
              ].map(({ n, label }) => (
                <div
                  key={n}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="vc-h3" style={{ color: "var(--accent)" }}>{n}</div>
                  <div
                    className="mt-1 leading-snug"
                    style={{ color: "var(--text-muted)", fontSize: "0.722rem" }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  who,
  children,
}: {
  who: "Koraly" | "Vous";
  children: React.ReactNode;
}) {
  const isK = who === "Koraly";
  return (
    <div
      className="px-6 py-5 rounded-xl text-[17px] leading-[1.55] max-w-[85%]"
      style={{
        background: isK ? "var(--accent-ink)" : "var(--bg-alt)",
        color: isK ? "var(--text-on-ink)" : "var(--text)",
        borderRadius: isK ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
        alignSelf: isK ? "flex-start" : "flex-end",
      }}
    >
      <div className="vc-micro mb-1.5" style={{ color: isK ? "var(--brass)" : "var(--text-muted)" }}>
        {who}
      </div>
      {children}
    </div>
  );
}

function ProductBubble() {
  return (
    <div
      className="px-6 py-5 rounded-xl max-w-[95%]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        borderRadius: "12px 12px 12px 2px",
      }}
    >
      <div className="vc-micro mb-2.5" style={{ color: "var(--text-muted)" }}>
        Produit sélectionné · Choix 1 sur 5
      </div>
      <div className="flex gap-4 items-center">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
          <Image
            src="/images/pomme-golden.jpg"
            alt="Pommes Golden"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-bold mb-1 truncate">Pommes Golden, sachet 1 kg</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Carrefour · 2,89&nbsp;€ · Origine France ·{" "}
            <strong style={{ color: "var(--accent)" }}>Nutriscore A</strong>
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 mt-3">
        <button
          type="button"
          className="px-4 py-2.5 text-sm font-bold rounded-md"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          ✓ Confirmer
        </button>
        <button
          type="button"
          className="px-4 py-2.5 text-sm font-bold rounded-md border-[1.5px]"
          style={{ borderColor: "var(--text)", color: "var(--text)" }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
