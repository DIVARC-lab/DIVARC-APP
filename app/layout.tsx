import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://divarc.app"),
  title: {
    default: "DIVARC — Tout. Au même endroit.",
    template: "%s · DIVARC",
  },
  description:
    "La super-app francophone qui réunit messagerie, marketplace, emploi, contenu et paiements. 320 millions de francophones, une seule application.",
  applicationName: "DIVARC",
  authors: [{ name: "DIVARC Lab" }],
  keywords: [
    "super-app",
    "francophone",
    "messagerie",
    "marketplace",
    "emploi",
    "paiements",
    "Mobile Money",
  ],
  openGraph: {
    title: "DIVARC — Tout. Au même endroit.",
    description:
      "La super-app francophone : messagerie, marketplace, emploi, contenu et paiements en une seule app.",
    url: "https://divarc.app",
    siteName: "DIVARC",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIVARC — Tout. Au même endroit.",
    description:
      "La super-app francophone : messagerie, marketplace, emploi, contenu et paiements.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f44" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg selection:bg-night selection:text-cream">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
