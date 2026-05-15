import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { themeBootstrapScript } from "@/components/ThemeProvider";
import { PWARegister } from "@/components/PWARegister";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DIVARC",
    /* Critique pour iOS Safari : sans apple-touch-icon explicite, Safari
       n'affiche pas le bouton "Ajouter à l'écran d'accueil" correctement
       (ou utilise une capture d'écran générique au lieu de l'icône). */
    startupImage: ["/apple-icon"],
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
    shortcut: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f44" },
  ],
  width: "device-width",
  initialScale: 1,
  /* iOS PWA : `cover` permet à `env(safe-area-inset-*)` de retourner
     des valeurs non-nulles (notch, home indicator, encoche). Sans ça,
     les paddings safe-area sont ignorés et le contenu passe sous la
     status bar ou est mangé par le home indicator. */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script
          // Bootstrap the theme before React hydrates so we never flash
          // the wrong color scheme.
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {children}
        <Toaster />
        <PWARegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
