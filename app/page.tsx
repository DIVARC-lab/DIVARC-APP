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

export default function Home() {
  return (
    <div className="flex flex-col">
      <SiteNav />
      <Hero />
      <ProofBar />
      <Manifesto />
      <Pillars />
      <Personas />
      <Vs />
      <Roadmap />
      <Vision />
      <Marquee items={CITIES} className="py-12" />
      <FAQSection />
      <CTASection />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg/80 border-b border-line">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-night-muted">
          <a href="#produit" className="hover:text-night transition-colors">
            Produit
          </a>
          <a href="#vs" className="hover:text-night transition-colors">
            Comparaison
          </a>
          <a href="#roadmap" className="hover:text-night transition-colors">
            Roadmap
          </a>
          <a href="#faq" className="hover:text-night transition-colors">
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
    <section className="relative grain overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-gold/40 via-gold/10 to-transparent blur-3xl halo-drift" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-night/20 via-night/5 to-transparent blur-3xl halo-drift" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-28 sm:pt-32 sm:pb-40 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-7 reveal-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-night text-cream text-[11px] font-semibold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-gold" aria-hidden />
            Beta privée — places limitées
          </span>

          <h1 className="mt-6 text-[clamp(2.8rem,8vw,6.4rem)] font-bold tracking-[-0.045em] leading-[0.92] text-night text-balance">
            Une <em className="font-display italic font-normal text-night-soft">seule</em>{" "}
            app pour
            <br />
            ta vie <span className="relative inline-block">
              entière.
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

          <p className="mt-8 text-lg sm:text-xl text-muted-strong max-w-xl text-pretty leading-relaxed">
            DIVARC réunit{" "}
            <strong className="text-night font-semibold">
              messagerie, marketplace, emploi, contenu et paiements
            </strong>{" "}
            dans une seule application — pensée pour les{" "}
            <strong className="text-night font-semibold">
              320 millions de francophones
            </strong>{" "}
            répartis entre Paris, Dakar, Abidjan, Casablanca et Montréal.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Devenir fondateur
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="#produit">Voir le produit</Link>
            </Button>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 max-w-md">
            {HERO_STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-4xl text-night">
                  {stat.value}
                </dt>
                <dd className="text-xs text-muted uppercase tracking-widest mt-1">
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
            <div className="absolute -right-10 bottom-12 z-20 hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-night text-cream shadow-[0_20px_60px_-20px_rgba(10,31,68,0.55)]">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-night font-bold">
                Y
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-cream/70">Yann · Paris</p>
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
  { value: "1", label: "Application" },
];

function ProofBar() {
  return (
    <section className="border-y border-line bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
        <p className="text-sm font-medium text-muted shrink-0">
          Bâtir <em className="font-display not-italic text-night">ce qui manquait</em> à
          l&apos;internet francophone.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {["Paris", "Dakar", "Yaoundé", "Abidjan", "Montréal", "Casablanca"].map(
            (city) => (
              <div key={city} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <span className="font-semibold text-night">{city}</span>
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
    <section className="relative py-28 sm:py-36 bg-night text-cream overflow-hidden grain">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,185,66,0.18),transparent_60%)]" />
      <div className="relative max-w-5xl mx-auto px-6 sm:px-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-gold">
          Manifeste
        </span>
        <p className="mt-6 font-display text-[clamp(2rem,5vw,4rem)] leading-[1.1] text-balance">
          Pendant que la Silicon Valley pense pour New York,
          <em className="italic block sm:inline text-gold-soft">
            {" "}
            personne ne pense pour Paris-Dakar.
          </em>
        </p>
        <p className="mt-6 max-w-2xl text-cream/75 text-lg leading-relaxed">
          Les apps américaines traitent la francophonie comme un{" "}
          <em className="text-cream font-semibold not-italic">marché secondaire</em>.
          Une traduction approximative, des paiements qui ne marchent qu&apos;en
          dollar, des modérateurs qui ne comprennent pas nos références.
          DIVARC inverse l&apos;équation : on construit{" "}
          <em className="text-gold not-italic font-semibold">d&apos;abord</em>
          {" "}pour nous.
        </p>
      </div>
    </section>
  );
}

const PILLARS = [
  {
    icon: MessageSquareText,
    title: "Discuter",
    body: "Messagerie chiffrée pour tes proches. Photos, audios, groupes, appels.",
  },
  {
    icon: ShoppingBag,
    title: "Vendre & acheter",
    body: "Marketplace de quartier. Vinted, mais autour de toi.",
  },
  {
    icon: Briefcase,
    title: "Travailler",
    body: "Profil pro, annonces d'emploi, missions courtes.",
  },
  {
    icon: Wallet,
    title: "Payer",
    body: "Stripe, Wave, Orange Money. Sans frais, instantané.",
  },
  {
    icon: Globe2,
    title: "Partager",
    body: "Stories, posts, vidéos. Sans algorithme toxique.",
  },
  {
    icon: Sparkles,
    title: "Découvrir",
    body: "Mini-apps, services locaux, divertissement.",
  },
];

function Pillars() {
  return (
    <section id="produit" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl">
          <KickerLabel>Le produit</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-7xl text-night text-balance leading-[1.02]">
            Six piliers, <em className="italic text-gold-deep">un seul écosystème</em>.
          </h2>
          <p className="mt-5 text-lg text-muted-strong max-w-xl">
            Chaque pilier de DIVARC remplace une app que tu utilises déjà — et
            les fait dialoguer entre elles, ce qui n&apos;est pas possible
            ailleurs.
          </p>
        </header>

        <div className="mt-16 grid lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Big chat showcase */}
          <article className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-night via-night-soft to-night text-cream p-8 sm:p-12 grain min-h-[420px]">
            <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-gold/30 blur-3xl halo-drift" />
            <div className="relative grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cream/10 text-cream text-[10px] font-bold uppercase tracking-widest">
                  Pilier 1
                </div>
                <h3 className="mt-4 font-display text-4xl text-balance">
                  Discuter, comme une <em className="italic text-gold-deep">vraie</em>{" "}
                  conversation.
                </h3>
                <p className="mt-4 text-cream/80 leading-relaxed">
                  Messagerie chiffrée bout-en-bout, audios, photos haute
                  qualité, groupes familiaux, appels gratuits.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    "Indicateurs de lecture optionnels",
                    "Multi-appareils synchronisés",
                    "Réactions emoji + threads",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
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
          <article className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-cream to-gold/10 border border-gold/20 p-8 grain min-h-[420px]">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
              Pilier 2
            </div>
            <h3 className="mt-4 font-display text-3xl text-night text-balance">
              Marketplace de <em className="italic text-gold-deep">quartier</em>.
            </h3>
            <p className="mt-3 text-night-muted text-sm leading-relaxed max-w-sm">
              Vends, achète, échange. Avec ta vraie communauté, autour de toi.
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
                className="lg:col-span-3 p-7 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-night/5 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-night" aria-hidden />
                </div>
                <h3 className="mt-5 font-display text-2xl text-night">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-night-muted leading-relaxed">
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
    <section className="py-24 sm:py-32 bg-bg-deep">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl">
          <KickerLabel>Pour qui</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-night text-balance leading-[1.05]">
            Construit <em className="italic text-gold-deep">avec</em> celles et ceux qui
            l&apos;utilisent.
          </h2>
        </header>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          <PersonaCard
            name="Aïssatou Diop"
            role="Étudiante en mode"
            city="Dakar"
            quote="Je commande mon tissu wax à Belleville et je le reçois chez ma cousine à Paris en 3 jours."
            accent="gold"
          />
          <PersonaCard
            name="Yann Mvondo"
            role="Freelance vidéaste"
            city="Yaoundé"
            quote="Je trouve mes contrats à Paris, je suis payé en EUR, mon père reçoit en XAF en 3 secondes."
            accent="night"
          />
          <PersonaCard
            name="Nadia Benhaddou"
            role="Mère de famille"
            city="Casablanca"
            quote="Toute la famille est sur DIVARC : mes enfants à Marseille, ma sœur à Montréal, mes parents à Tanger."
            accent="cream"
          />
        </div>
      </div>
    </section>
  );
}

function Vs() {
  return (
    <section id="vs" className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl mb-12">
          <KickerLabel>Comparaison</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-night text-balance leading-[1.05]">
            Pourquoi pas <em className="italic text-gold-deep">une seule</em> app, mais{" "}
            <em className="italic text-gold-deep">la bonne</em>.
          </h2>
          <p className="mt-5 text-lg text-muted-strong max-w-xl">
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
    <section id="roadmap" className="py-24 sm:py-32 bg-bg-deep">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <header className="max-w-3xl mb-14">
          <KickerLabel>Roadmap publique</KickerLabel>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-night text-balance leading-[1.05]">
            Construit <em className="italic text-gold-deep">en transparence</em>, sprint après
            sprint.
          </h2>
          <p className="mt-5 text-lg text-muted-strong max-w-xl">
            Tu peux suivre exactement où nous en sommes. Chaque sprint = 4 à 6
            semaines. Un livrable visible à chaque fois.
          </p>
        </header>
        <RoadmapTimeline />
      </div>
    </section>
  );
}

function Vision() {
  return (
    <section className="py-24 sm:py-32 bg-night text-cream relative overflow-hidden grain">
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-gold/30 via-gold/5 to-transparent blur-3xl halo-drift" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-gold">
            Notre vision
          </span>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-balance leading-[1.05]">
            Le pont entre <em className="italic text-gold-deep">deux mondes</em>.
          </h2>
          <p className="mt-6 text-lg text-cream/80 max-w-xl leading-relaxed">
            DIVARC n&apos;est pas une app pour la France ni une app pour
            l&apos;Afrique. C&apos;est <strong className="text-gold">la</strong>{" "}
            app qui connecte les deux — et tous les territoires francophones du
            monde, du Québec à la Suisse.
          </p>

          <ul className="mt-10 space-y-4">
            {VISION_POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-4">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-gold shrink-0" />
                <div>
                  <p className="font-semibold text-cream">{point.title}</p>
                  <p className="text-sm text-cream/70 mt-0.5">{point.body}</p>
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
    title: "Mobile Money intégré dès le sprint 5",
    body: "Wave, Orange Money, MTN — au même titre que Stripe.",
  },
  {
    title: "Multi-devise réelle",
    body: "EUR, XAF, XOF, MAD, CAD. Conversion en temps réel.",
  },
  {
    title: "Interface en français — pas une traduction",
    body: "Pensée en français, écrite par des francophones.",
  },
  {
    title: "Modération adaptée à nos cultures",
    body: "Nos références, nos sujets, notre humour.",
  },
];

const CITIES = [
  "Paris", "·", "Dakar", "·", "Abidjan", "·", "Yaoundé", "·",
  "Montréal", "·", "Casablanca", "·", "Bruxelles", "·", "Cotonou", "·",
  "Lomé", "·", "Kinshasa", "·", "Tunis", "·", "Lausanne", "·", "Bamako",
];

function FAQSection() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6 sm:px-10">
        <header className="mb-10">
          <KickerLabel>Questions fréquentes</KickerLabel>
          <h2 className="mt-3 font-display text-5xl text-night text-balance leading-[1.05]">
            Ce que tu te demandes <em className="italic text-gold-deep">peut-être</em>.
          </h2>
        </header>
        <FAQ
          items={[
            {
              question: "Pourquoi une nouvelle app ? On en a déjà trop.",
              answer:
                "Justement. Aujourd'hui, tu jongles entre WhatsApp, Vinted, LinkedIn, Instagram, Lydia, Wave, Indeed... DIVARC les remplace toutes en une seule, mieux pensée pour les francophones. Moins d'apps, plus de cohérence.",
            },
            {
              question: "Mes données restent-elles en Europe ?",
              answer:
                "Oui. Notre infrastructure (Supabase + Vercel) est hébergée en Europe avec conformité RGPD stricte. Tu peux exporter ou supprimer toutes tes données à tout moment.",
            },
            {
              question: "C'est gratuit ?",
              answer:
                "L'app est gratuite. Aucune publicité algorithmique. Le modèle économique repose sur des frais minimes (1%) sur certaines transactions marketplace, et un abonnement DIVARC Premium optionnel (à venir).",
            },
            {
              question: "Quand sortira la version finale ?",
              answer:
                "La beta privée est en cours. Le lancement public est prévu après le sprint 5 (paiements). Suis la roadmap ci-dessus pour les jalons.",
            },
            {
              question: "Comment être beta-testeur ?",
              answer:
                "Crée un compte. Les premiers inscrits reçoivent automatiquement le badge 'Fondateur' et accèdent à toutes les fonctionnalités au fur et à mesure de leur sortie.",
            },
            {
              question: "Qui est derrière DIVARC ?",
              answer:
                "DIVARC Lab, une équipe française avec des racines dans la diaspora africaine et maghrébine. Bâtie à Paris pour le monde francophone.",
            },
          ]}
        />
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 sm:px-10 pb-24">
      <div className="relative max-w-7xl mx-auto rounded-[36px] overflow-hidden bg-gradient-to-br from-night via-night-soft to-night-muted text-cream p-10 sm:p-16 grain">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-gold/40 to-transparent blur-3xl halo-drift" />
        <div className="relative grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-gold">
              Beta privée
            </span>
            <h2 className="mt-3 font-display text-5xl sm:text-6xl text-balance leading-[1.05]">
              Rejoins le <em className="italic text-gold-deep">cercle des fondateurs</em>.
            </h2>
            <p className="mt-5 text-lg text-cream/80 max-w-xl">
              Accès anticipé à toutes les nouveautés. Badge fondateur permanent.
              Voix dans la roadmap. Et la satisfaction d&apos;avoir construit
              cette app avec nous.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                asChild
                className="bg-gold text-night hover:bg-gold-soft"
              >
                <Link href="/signup">
                  Créer mon compte fondateur
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="text-cream hover:bg-white/10"
              >
                <Link href="/login">J&apos;ai déjà un compte</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-4">
            <div className="flex -space-x-2">
              {["Aïssatou", "Yann", "Nadia", "Pierre", "Fatou"].map((name) => (
                <div key={name} className="ring-4 ring-night-soft rounded-full">
                  <Avatar src={null} fullName={name} size="md" />
                </div>
              ))}
            </div>
            <p className="text-sm text-cream/60 text-center">
              <strong className="text-cream">Plusieurs centaines</strong> de
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
    <footer className="border-t border-line bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <span className="font-display text-2xl text-night">DIVARC</span>
            </div>
            <p className="mt-4 text-sm text-muted max-w-xs leading-relaxed">
              La super-app francophone. Bâtie à Paris, pensée pour les
              francophones du monde entier.
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
        <div className="mt-12 pt-8 border-t border-line flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} DIVARC Lab — Tous droits réservés.
          </p>
          <p className="text-xs text-muted">
            Bâti avec ✦ par et pour la francophonie.
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
      <h4 className="text-xs font-semibold tracking-widest uppercase text-night-muted">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-night hover:text-gold-deep transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
