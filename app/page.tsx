import {
  ArrowRight,
  Briefcase,
  Globe2,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";
import { ArcMark } from "@/components/marketing/ArcMark";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { FAQ } from "@/components/marketing/FAQ";
import { Marquee } from "@/components/marketing/Marquee";
import { PaymentReceipt } from "@/components/marketing/PaymentReceipt";
import { PersonaCard } from "@/components/marketing/PersonaCard";
import { PhoneMockChat } from "@/components/marketing/PhoneMockChat";
import { PhoneMockMarket } from "@/components/marketing/PhoneMockMarket";
import { RoadmapTimeline } from "@/components/marketing/RoadmapTimeline";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";

/* Style forcé light : sections claires (cream/white). */
const forcedLightStyle = {
  "--night": "#0a1f44",
  "--night-soft": "#142a55",
  "--night-muted": "#2a3d6b",
  "--night-dim": "#4b5b87",
  "--gold-deep": "#b88a2a",
  "--bg": "#ffffff",
  "--bg-deep": "#fff8e8",
  "--bg-soft": "#f8f9fb",
  "--fg": "#0a1f44",
  "--fg-muted": "#4b5b87",
  "--fg-subtle": "#8993a8",
  "--line": "#e6e9f0",
  "--line-strong": "#d2d7e2",
  "--muted": "#6b7280",
  "--muted-strong": "#4b5563",
  "--surface": "#ffffff",
  "--surface-2": "#f8f9fb",
  "--color-night": "#0a1f44",
  "--color-night-soft": "#142a55",
  "--color-night-muted": "#2a3d6b",
  "--color-night-dim": "#4b5b87",
  colorScheme: "light",
} as React.CSSProperties;

/* Style forcé dark : à appliquer sur les sections SOMBRES (bg-[#0a1f44]).
   Inverse les vars text-[#0a1f44]/X pour qu'elles deviennent cream par
   défaut dans ces zones (sinon navy sur navy = invisible). */
const forcedDarkStyle = {
  "--night": "#fff8e8",
  "--night-soft": "rgba(255,248,232,0.92)",
  "--night-muted": "rgba(255,248,232,0.72)",
  "--night-dim": "rgba(255,248,232,0.55)",
  "--gold-deep": "#f8cd76",
  "--fg": "#fff8e8",
  "--fg-muted": "rgba(255,248,232,0.7)",
  "--fg-subtle": "rgba(255,248,232,0.5)",
  "--muted": "rgba(255,248,232,0.6)",
  "--muted-strong": "rgba(255,248,232,0.85)",
  "--color-night": "#fff8e8",
  "--color-night-soft": "rgba(255,248,232,0.92)",
  "--color-night-muted": "rgba(255,248,232,0.72)",
  "--color-night-dim": "rgba(255,248,232,0.55)",
  colorScheme: "dark",
} as React.CSSProperties;

export default function Home() {
  return (
    <div
      data-theme="light"
      style={forcedLightStyle}
      className="flex flex-col bg-[#fff8e8] text-[#0a1f44]"
    >
      <SiteNav />
      <Hero />
      <ProofBar />
      <Manifesto />
      <Pillars />
      <Personas />
      <Vs />
      <Roadmap />
      <Vision />
      <Marquee items={CITIES} className="py-12 bg-[#fff8e8]" />
      <FAQSection />
      <CTASection />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#fff8e8] border-b border-[#e6e9f0]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#2a3d6b]">
          <a href="#produit" className="hover:text-[#0a1f44] transition-colors">
            Produit
          </a>
          <a href="#vs" className="hover:text-[#0a1f44] transition-colors">
            Comparaison
          </a>
          <a href="#roadmap" className="hover:text-[#0a1f44] transition-colors">
            Roadmap
          </a>
          <a href="#faq" className="hover:text-[#0a1f44] transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              Rejoindre <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative grain overflow-hidden bg-[#fff8e8]">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-gold/40 via-gold/10 to-transparent blur-3xl halo-drift" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#0a1f44]/20 via-[#0a1f44]/5 to-transparent blur-3xl halo-drift" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-28 sm:pt-32 sm:pb-40 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-7 reveal-up">
          <span
            style={{ color: "#fff8e8" }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a1f44] text-[11px] font-semibold tracking-widest uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f4b942]" aria-hidden />
            Beta privée — places limitées
          </span>

          <h1 className="mt-6 text-[clamp(2.8rem,8vw,6.4rem)] font-bold tracking-[-0.045em] leading-[0.92] text-[#0a1f44] text-balance">
            Tout ce que tu fais{" "}
            <em className="font-display italic font-normal text-[#142a55]">
              en ligne
            </em>
            ,
            <br />
            dans <span className="relative inline-block">
              une app.
              <svg
                className="absolute -bottom-3 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 9 Q 75 2 150 7 T 298 5"
                  stroke="#F4B942"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-draw-arc"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-[#142a55] max-w-xl text-pretty leading-relaxed">
            Discuter, vendre, travailler, payer, partager — DIVARC réunit{" "}
            <strong className="text-[#0a1f44] font-semibold">
              tout ce qui compte
            </strong>{" "}
            dans une seule application. Pensée pour les{" "}
            <strong className="text-[#0a1f44] font-semibold">
              320 millions de francophones
            </strong>
            , partout dans le monde.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Devenir fondateur
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="#produit">Découvrir DIVARC</Link>
            </Button>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 max-w-md">
            {HERO_STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-4xl text-[#0a1f44]">
                  {stat.value}
                </dt>
                <dd className="text-xs text-[#4b5b87] uppercase tracking-widest mt-1">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5 relative flex justify-center reveal-up [animation-delay:200ms]">
          <div className="relative">
            <ArcMark
              size={460}
              className="absolute -top-12 -right-16 opacity-90"
            />
            <div className="relative z-10 translate-y-6">
              <PhoneMockChat />
            </div>
            <div className="absolute -left-16 top-32 z-20 hidden md:block">
              <div className="rotate-[-6deg] scale-90 origin-bottom-right">
                <PaymentReceipt />
              </div>
            </div>
            <div className="absolute -right-10 bottom-12 z-20 hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0a1f44] text-[#fff8e8] shadow-[0_20px_60px_-20px_rgba(10,31,68,0.55)]">
              <div className="w-8 h-8 rounded-full bg-[#f4b942] flex items-center justify-center text-[#0a1f44] font-bold">
                L
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-[#fff8e8]/70">Léa · Lyon</p>
                <p className="text-sm font-medium">Vu ton annonce ✨</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const HERO_STATS = [
  { value: "320M", label: "Francophones" },
  { value: "54", label: "Pays" },
  { value: "1", label: "App" },
];

function ProofBar() {
  return (
    <section className="border-y border-[#e6e9f0] bg-[#fff8e8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
        <p className="text-sm font-medium text-[#4b5b87] shrink-0">
          Construire{" "}
          <em className="font-display not-italic text-[#0a1f44]">
            ce qui manquait
          </em>{" "}
          à l&apos;internet francophone.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {["Paris", "Lyon", "Bruxelles", "Genève", "Montréal", "Dakar"].map(
            (city) => (
              <div key={city} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f4b942] animate-pulse" />
                <span className="font-semibold text-[#0a1f44]">{city}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section
      data-theme="dark"
      style={forcedDarkStyle}
      className="relative py-28 sm:py-36 bg-[#0a1f44] text-[#fff8e8] overflow-hidden grain"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,185,66,0.18),transparent_60%)]" />
      <div className="relative max-w-5xl mx-auto px-6 sm:px-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#f4b942]">
          Manifeste
        </span>
        <p className="mt-6 font-display text-[clamp(2rem,5vw,4rem)] leading-[1.1] text-balance">
          Les meilleures apps ont été pensées ailleurs,
          <em className="italic block sm:inline text-[#f8cd76]">
            {" "}
            pour quelqu&apos;un d&apos;autre.
          </em>
        </p>
        <p className="mt-6 max-w-2xl text-[#fff8e8]/75 text-lg leading-relaxed">
          Une traduction approximative, des paiements bridés, des modérateurs
          qui ne comprennent pas nos références, des interfaces conçues à
          10 000 kilomètres. DIVARC inverse l&apos;équation : on construit{" "}
          <em className="text-[#f4b942] not-italic font-semibold">d&apos;abord</em>
          {" "}pour la francophonie — et on l&apos;ouvre au monde ensuite.
        </p>
      </div>
    </section>
  );
}

const PILLARS = [
  {
    icon: MessageSquareText,
    title: "Discuter",
    body: "Messagerie chiffrée. Photos, audios, groupes, appels — sans limite.",
  },
  {
    icon: ShoppingBag,
    title: "Vendre & acheter",
    body: "Marketplace de quartier. Comme Vinted, mais avec tes voisins.",
  },
  {
    icon: Briefcase,
    title: "Travailler",
    body: "Profil pro, offres d'emploi, missions courtes payées vite.",
  },
  {
    icon: Wallet,
    title: "Payer",
    body: "Carte, virement, mobile money. Sans frais cachés, instantané.",
  },
  {
    icon: Globe2,
    title: "Partager",
    body: "Posts, stories, lives. Tu choisis ton fil, pas l'algorithme.",
  },
  {
    icon: Sparkles,
    title: "Découvrir",
    body: "Cercles d'intérêt, services locaux, mini-apps utiles.",
  },
];

function Pillars() {
  return (
    <section id="produit" className="py-24 sm:py-32 bg-[#fff8e8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl">
          <KickerLabel>Le produit</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-7xl text-[#0a1f44] text-balance leading-[1.02]">
            Six piliers,{" "}
            <em className="italic text-[#b88a2a]">un seul écosystème</em>.
          </h2>
          <p className="mt-5 text-lg text-[#142a55] max-w-xl">
            Chaque pilier remplace une app que tu utilises déjà. Mais surtout,
            ils dialoguent entre eux — ce qui n&apos;existe nulle part ailleurs.
          </p>
        </header>

        <div className="mt-16 grid lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Big chat showcase */}
          <article
            data-theme="dark"
            style={forcedDarkStyle}
            className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1f44] via-[#142a55] to-[#0a1f44] text-[#fff8e8] p-8 sm:p-12 grain min-h-[420px]"
          >
            <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#f4b942]/30 blur-3xl halo-drift" />
            <div className="relative grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#fff8e8]/10 text-[#fff8e8] text-[10px] font-bold uppercase tracking-widest">
                  Pilier 1
                </div>
                <h3 className="mt-4 font-display text-4xl text-balance">
                  Discuter, comme une{" "}
                  <em className="italic text-[#b88a2a]">vraie</em>{" "}
                  conversation.
                </h3>
                <p className="mt-4 text-[#fff8e8]/80 leading-relaxed">
                  Messagerie chiffrée bout-en-bout, audios haute qualité, lives
                  vidéo, appels gratuits. Sans collecte de tes données.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    "Lectures optionnelles, statut en ligne désactivable",
                    "Multi-appareils synchronisés en temps réel",
                    "Réactions, threads, messages éphémères",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f4b942]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden sm:flex justify-center">
                <div className="scale-90">
                  <PhoneMockChat tone="dark" />
                </div>
              </div>
            </div>
          </article>

          {/* Marketplace */}
          <article className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff8e8] to-gold/10 border border-gold/20 p-8 grain min-h-[420px]">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0a1f44] text-[#fff8e8] text-[10px] font-bold uppercase tracking-widest">
              Pilier 2
            </div>
            <h3 className="mt-4 font-display text-3xl text-[#0a1f44] text-balance">
              Marketplace de{" "}
              <em className="italic text-[#b88a2a]">quartier</em>.
            </h3>
            <p className="mt-3 text-[#2a3d6b] text-sm leading-relaxed max-w-sm">
              Achète, vends, échange avec ta vraie communauté. Sans publicité,
              sans frais cachés, en confiance.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="scale-90 origin-top">
                <PhoneMockMarket />
              </div>
            </div>
          </article>

          {/* Mini cards */}
          {PILLARS.slice(2).map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className="lg:col-span-3 p-7 rounded-3xl bg-[#ffffff] border border-[#e6e9f0] hover:border-night/30 hover:shadow-soft transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#0a1f44]/5 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#0a1f44]" aria-hidden />
                </div>
                <h3 className="mt-5 font-display text-2xl text-[#0a1f44]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-[#2a3d6b] leading-relaxed">
                  {pillar.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Personas() {
  return (
    <section className="py-24 sm:py-32 bg-[#fff8e8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl">
          <KickerLabel>Pour qui</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-[#0a1f44] text-balance leading-[1.05]">
            Construit{" "}
            <em className="italic text-[#b88a2a]">avec</em> celles et ceux qui
            l&apos;utilisent.
          </h2>
        </header>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          <PersonaCard
            name="Léa"
            role="Étudiante en design"
            city="Lyon"
            quote="Je trouve mes locations, mes petits jobs et mes amis dans la même app. Plus besoin de jongler entre cinq plateformes."
            accent="gold"
          />
          <PersonaCard
            name="Sami"
            role="Freelance vidéaste"
            city="Bruxelles"
            quote="Je décroche mes contrats, j'envoie mes factures, je suis payé. Tout en français, tout instantané."
            accent="night"
          />
          <PersonaCard
            name="Camille"
            role="Mère de famille"
            city="Montréal"
            quote="Toute la famille est sur DIVARC, où qu'on soit dans le monde. Les enfants, mes parents, mes cousins."
            accent="cream"
          />
        </div>
      </div>
    </section>
  );
}

function Vs() {
  return (
    <section id="vs" className="py-24 sm:py-32 bg-[#fff8e8]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl mb-12">
          <KickerLabel>Comparaison</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-[#0a1f44] text-balance leading-[1.05]">
            Pas <em className="italic text-[#b88a2a]">une de plus</em>, mais{" "}
            <em className="italic text-[#b88a2a]">la bonne</em>.
          </h2>
          <p className="mt-5 text-lg text-[#142a55] max-w-xl">
            Les autres ont été pensées ailleurs, pour quelqu&apos;un
            d&apos;autre. Voici ce que ça change concrètement.
          </p>
        </header>
        <ComparisonTable />
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section id="roadmap" className="py-24 sm:py-32 bg-[#fff8e8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl mb-14">
          <KickerLabel>Roadmap publique</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-[#0a1f44] text-balance leading-[1.05]">
            Construit{" "}
            <em className="italic text-[#b88a2a]">en transparence</em>, sprint
            après sprint.
          </h2>
          <p className="mt-5 text-lg text-[#142a55] max-w-xl">
            Suis exactement où nous en sommes. Chaque sprint = 4 à 6 semaines.
            Un livrable concret à chaque étape.
          </p>
        </header>
        <RoadmapTimeline />
      </div>
    </section>
  );
}

function Vision() {
  return (
    <section
      data-theme="dark"
      style={forcedDarkStyle}
      className="py-24 sm:py-32 bg-[#0a1f44] text-[#fff8e8] relative overflow-hidden grain"
    >
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-gold/30 via-gold/5 to-transparent blur-3xl halo-drift" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#f4b942]">
            Notre vision
          </span>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-balance leading-[1.05]">
            Une app pour <em className="italic text-[#b88a2a]">tous</em>,
            partout.
          </h2>
          <p className="mt-6 text-lg text-[#fff8e8]/80 max-w-xl leading-relaxed">
            DIVARC connecte la francophonie mondiale —
            <strong className="text-[#f4b942]"> 320 millions de personnes</strong>{" "}
            qui parlent la même langue, partagent les mêmes valeurs, et méritent
            une app à leur hauteur. De Paris à Dakar, de Montréal à Genève.
          </p>

          <ul className="mt-10 space-y-4">
            {VISION_POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-4">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#f4b942] shrink-0" />
                <div>
                  <p className="font-semibold text-[#fff8e8]">{point.title}</p>
                  <p className="text-sm text-[#fff8e8]/70 mt-0.5">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 relative flex justify-center">
          <ArcMark size={520} className="opacity-90" />
        </div>
      </div>
    </section>
  );
}

const VISION_POINTS = [
  {
    title: "Paiements universels",
    body: "Carte, virement, mobile money. Aucune frontière, aucun délai.",
  },
  {
    title: "Multi-devise réelle",
    body: "EUR, CHF, CAD, XOF, XAF, MAD. Conversion en temps réel sans frais cachés.",
  },
  {
    title: "Interface pensée en français",
    body: "Pas une traduction. Écrite par et pour des francophones.",
  },
  {
    title: "Modération humaine et juste",
    body: "Pas d'algorithme aveugle. De vraies personnes qui comprennent.",
  },
];

const CITIES = [
  "Paris", "·", "Lyon", "·", "Marseille", "·", "Bruxelles", "·", "Genève",
  "·", "Montréal", "·", "Dakar", "·", "Abidjan", "·", "Casablanca", "·",
  "Yaoundé", "·", "Tunis", "·", "Kinshasa", "·", "Beyrouth", "·", "Lausanne",
];

function FAQSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-[#fff8e8]">
      <div className="max-w-3xl mx-auto px-6 sm:px-10">
        <header className="mb-10">
          <KickerLabel>Questions fréquentes</KickerLabel>
          <h2 className="mt-3 font-display text-5xl text-[#0a1f44] text-balance leading-[1.05]">
            Ce que tu te demandes{" "}
            <em className="italic text-[#b88a2a]">peut-être</em>.
          </h2>
        </header>
        <FAQ
          items={[
            {
              question: "Pourquoi une nouvelle app ? On en a déjà trop.",
              answer:
                "Justement. Aujourd'hui, tu jongles entre WhatsApp, Vinted, LinkedIn, Instagram, Lydia, Wave, Indeed… DIVARC les remplace toutes en une seule, mieux pensée pour ta vie. Moins d'apps, plus de cohérence, plus de sens.",
            },
            {
              question: "Mes données restent-elles privées ?",
              answer:
                "Oui. Hébergement en Europe, conformité RGPD stricte, messagerie chiffrée. Pas de revente de données, jamais. Tu peux exporter ou supprimer tout ce qui te concerne à tout moment, en un clic.",
            },
            {
              question: "C'est gratuit ?",
              answer:
                "L'app est gratuite. Pas de publicité ciblée, pas d'algorithme qui te garde captif·ve. Notre modèle économique repose sur des frais minimes (1 %) sur certaines transactions marketplace, et un abonnement DIVARC Premium optionnel à venir.",
            },
            {
              question: "Quand sortira la version finale ?",
              answer:
                "La beta privée est en cours. Le lancement public est prévu après le sprint paiements. Tu peux suivre la roadmap publique ci-dessus pour voir précisément où nous en sommes.",
            },
            {
              question: "Comment être beta-testeur ?",
              answer:
                "Crée ton compte. Les premiers inscrits reçoivent automatiquement le badge « Fondateur » et accèdent à toutes les nouvelles fonctionnalités en avant-première, dès qu'elles sortent.",
            },
            {
              question: "Qui est derrière DIVARC ?",
              answer:
                "DIVARC Lab, une équipe indépendante basée à Paris. Notre mission : bâtir l'app que la francophonie mérite, sans dépendre d'aucun géant tech américain ou chinois.",
            },
          ]}
        />
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 sm:px-10 pb-24 bg-[#fff8e8]">
      <div
        data-theme="dark"
        style={forcedDarkStyle}
        className="relative max-w-7xl mx-auto rounded-[36px] overflow-hidden bg-gradient-to-br from-[#0a1f44] via-[#142a55] to-[#2a3d6b] text-[#fff8e8] p-10 sm:p-16 grain"
      >
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-gold/40 to-transparent blur-3xl halo-drift" />
        <div className="relative grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#f4b942]">
              Beta privée
            </span>
            <h2 className="mt-3 font-display text-5xl sm:text-6xl text-balance leading-[1.05]">
              Rejoins le{" "}
              <em className="italic text-[#b88a2a]">cercle des fondateurs</em>.
            </h2>
            <p className="mt-5 text-lg text-[#fff8e8]/80 max-w-xl">
              Accès anticipé à toutes les nouveautés. Badge fondateur permanent.
              Une voix dans la roadmap. Et la satisfaction d&apos;avoir
              construit cette app avec nous.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                asChild
                className="bg-[#f4b942] text-[#0a1f44] hover:bg-[#f8cd76]"
              >
                <Link href="/signup">
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="text-[#fff8e8] hover:bg-[#ffffff]/10"
              >
                <Link href="/login">J&apos;ai déjà un compte</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-4">
            <div className="flex -space-x-2">
              {["Léa", "Sami", "Camille", "Noah", "Maya"].map((name) => (
                <div key={name} className="ring-4 ring-night-soft rounded-full">
                  <Avatar src={null} fullName={name} size="md" />
                </div>
              ))}
            </div>
            <p className="text-sm text-[#fff8e8]/60 text-center">
              <strong className="text-[#fff8e8]">Des centaines</strong> de
              fondateurs déjà inscrits.
              <br />
              Sois parmi les premiers de ta ville.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#e6e9f0] bg-[#fff8e8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <span className="font-display text-2xl text-[#0a1f44]">DIVARC</span>
            </div>
            <p className="mt-4 text-sm text-[#4b5b87] max-w-xs leading-relaxed">
              La super-app francophone. Bâtie à Paris, pensée pour toutes les
              francophones et tous les francophones du monde.
            </p>
          </div>
          <FooterColumn
            title="Produit"
            links={[
              ["Piliers", "#produit"],
              ["Comparaison", "#vs"],
              ["Roadmap", "#roadmap"],
              ["FAQ", "#faq"],
            ]}
          />
          <FooterColumn
            title="Compte"
            links={[
              ["Connexion", "/login"],
              ["Inscription", "/signup"],
            ]}
          />
        </div>
        <div className="mt-12 pt-8 border-t border-[#e6e9f0] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <p className="text-xs text-[#4b5b87]">
            © {new Date().getFullYear()} DIVARC Lab — Tous droits réservés.
          </p>
          <p className="text-xs text-[#4b5b87]">
            Construit avec ✦ pour la francophonie mondiale.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-widest uppercase text-[#2a3d6b]">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-[#0a1f44] hover:text-[#b88a2a] transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
