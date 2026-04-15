import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coraly — Pour les seniors, les personnes malvoyantes et les aidants",
  description:
    "Découvrez comment Coraly accompagne seniors, personnes malvoyantes et aidants vers plus d'autonomie et d'indépendance.",
  alternates: {
    canonical: "/cas-usage",
  },
  openGraph: {
    type: "website",
    title: "Coraly — Pour les seniors, les personnes malvoyantes et les aidants",
    description:
      "Découvrez comment Coraly accompagne seniors, personnes malvoyantes et aidants vers plus d'autonomie et d'indépendance.",
    url: "/cas-usage",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Coraly — Cas d'usage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coraly — Pour les seniors, les personnes malvoyantes et les aidants",
    description:
      "Comment Coraly accompagne seniors, personnes malvoyantes et aidants vers l'autonomie.",
    images: ["/images/og-default.jpg"],
  },
};

export default function CasUsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
