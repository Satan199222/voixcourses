import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs Coraly — Gratuit pour les particuliers, offre Pro pour les associations",
  description:
    "Coraly est gratuit pour les particuliers. Les associations et structures médico-sociales bénéficient d'une offre dédiée multi-utilisateurs.",
  alternates: {
    canonical: "/tarifs",
  },
  openGraph: {
    type: "website",
    title: "Tarifs Coraly — Gratuit pour les particuliers",
    description:
      "Coraly est gratuit pour les particuliers. Les associations et structures médico-sociales bénéficient d'une offre dédiée multi-utilisateurs.",
    url: "/tarifs",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Tarifs Coraly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs Coraly — Gratuit pour les particuliers",
    description:
      "Coraly est gratuit pour les particuliers. Les associations bénéficient d'une offre Pro dédiée.",
    images: ["/images/og-default.jpg"],
  },
};

export default function TarifsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
