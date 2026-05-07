import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DIVARC — Tout. Au même endroit.",
  description:
    "DIVARC est la super-app francophone qui réunit messagerie, marketplace, emploi, contenu et paiements en une seule application.",
  metadataBase: new URL("https://divarc.app"),
  openGraph: {
    title: "DIVARC — Tout. Au même endroit.",
    description:
      "La super-app francophone : messagerie, marketplace, emploi, contenu et paiements.",
    url: "https://divarc.app",
    siteName: "DIVARC",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
