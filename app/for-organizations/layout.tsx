import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business, Advertising & Partnerships",
  description:
    "Partner with Verity through organization plans, clearly labelled advertising, education programmes and community partnerships.",
  openGraph: {
    title: "Verity Business — Advertising & Partnerships",
    description:
      "Grow your brand through transparent partnerships that respect the trust of Verity communities.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Verity Business — Advertising & Partnerships",
    description:
      "Explore organization plans, advertising and community partnerships with Verity.",
  },
};

export default function BusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
