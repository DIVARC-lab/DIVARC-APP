import {
  ArrowRight,
  Briefcase,
  MessageSquareText,
  Sparkles,
  ShoppingBag,
  Wallet,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo, Wordmark } from "@/components/Logo";
import { ArcMark } from "@/components/marketing/ArcMark";
import { PhoneMock } from "@/components/marketing/PhoneMock";
import { Marquee } from "@/components/marketing/Marquee";

export default function Home() {
  return (
    <div className="flex flex-col">
      <SiteNav />
      <Hero />
      <SocialProof />
      <Pillars />
      <ProductShowcase />
      <CommunityMarquee />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg/80 border-b border-line">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Wordmark />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-night-muted">
          <a href="#vision" className="hover:text-night transition-colors">
            Vision
          </a>
          <a href="#produit" className="hover:text-night transition-colors">
            Produit
          </a>
          <a href="#communaute" className="hover:text-night transition-colors">
            Communauté
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

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-24 sm:pt-32 sm:pb-32 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 reveal-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-night text-cream text-[11px] font-semibold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-gold" aria-hidden />
            Bientôt — Beta privée
          </span>

          <h1 className="mt-6 text-[clamp(2.6rem,7vw,5.6rem)] font-bold tracking-[-0.04em] leading-[0.95] text-night text-balance">
            Tout. <em className="font-display italic font-normal text-night-soft">au même</em>{" "}
            <span className="relative inline-block">
              endroit.
              <svg
                className="absolute -bottom-2 left-0 w-full"
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
            DIVARC réunit ce que tu utilises chaque jour — discussions,
            marketplace, emploi, contenu, paiements — dans une seule
            application pensée pour les{" "}
            <strong className="text-night font-semibold">
              320 millions de francophones
            </strong>{" "}
            du monde entier.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Créer mon compte
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="#produit">Découvrir l&apos;app</Link>
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {[
              { value: "320M", label: "Francophones" },
              { value: "54", label: "Pays" },
              { value: "1", label: "Application" },
            ].map((stat) => (
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
            <ArcMark size={420} className="absolute -top-8 -right-12 opacity-90" />
            <div className="relative z-10 translate-y-6">
              <PhoneMock />
            </div>
            {/* Floating cards */}
            <div className="absolute -left-12 top-20 z-20 hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-line shadow-[0_20px_60px_-20px_rgba(10,31,68,0.45)]">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-700" aria-hidden />
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-muted">Reçu de Maman</p>
                <p className="text-sm font-bold text-night">+ 50 000 XAF</p>
              </div>
            </div>
            <div className="absolute -right-6 bottom-32 z-20 hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-night text-cream shadow-[0_20px_60px_-20px_rgba(10,31,68,0.55)]">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-night font-bold">
                A
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-cream/70">Aïssatou</p>
                <p className="text-sm font-medium">À tout de suite ✨</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-line bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-10 items-center">
        <p className="text-sm font-medium text-muted">
          Bâtir <em className="font-display not-italic text-night">ce qui manquait</em> à
          l&apos;Internet francophone.
        </p>
        {["Paris", "Dakar", "Yaoundé", "Abidjan"].map((city) => (
          <div key={city} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-sm font-semibold text-night">{city}</span>
            <span className="text-xs text-muted">— Beta</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const PILLARS = [
  {
    icon: MessageSquareText,
    title: "Discuter",
    body: "Messagerie chiffrée pour tes proches et ta communauté. Photos, audios, groupes, appels.",
    accent: "from-night to-night-soft",
    text: "text-cream",
  },
  {
    icon: ShoppingBag,
    title: "Vendre & acheter",
    body: "Une marketplace de quartier. Vide-dressing, mobilier, services. Comme Vinted, mais autour de toi.",
    accent: "from-gold to-gold-deep",
    text: "text-night",
  },
  {
    icon: Briefcase,
    title: "Travailler",
    body: "Profil pro, annonces d'emploi, missions courtes. Pour les freelances, étudiants et entrepreneurs.",
    accent: "from-bg-deep to-bg",
    text: "text-night",
  },
  {
    icon: Users,
    title: "Partager",
    body: "Stories, posts, vidéos courtes. Sans algorithme toxique. Tu vois ce que tes proches publient.",
    accent: "from-cream to-bg",
    text: "text-night",
  },
  {
    icon: Wallet,
    title: "Payer",
    body: "Stripe en Europe, Mobile Money en Afrique. Envoie de l'argent à ta famille en un clic.",
    accent: "from-emerald-700 to-emerald-900",
    text: "text-cream",
  },
  {
    icon: Sparkles,
    title: "Et bien plus",
    body: "Mini-apps, services locaux, divertissement. DIVARC grandit avec sa communauté.",
    accent: "from-night-muted to-night",
    text: "text-cream",
  },
];

function Pillars() {
  return (
    <section id="produit" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
            Le produit
          </span>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-night text-balance">
            Une <em className="italic">seule</em> app pour ce qui compte.
          </h2>
          <p className="mt-4 text-lg text-muted-strong max-w-xl">
            Six piliers qui couvrent ta vie sociale, économique et
            professionnelle. Pensés pour la diaspora, la France, le Maghreb et
            l&apos;Afrique francophone.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className={`group relative overflow-hidden rounded-3xl p-7 bg-gradient-to-br ${pillar.accent} ${pillar.text} ${
                  idx === 0 ? "lg:row-span-2 min-h-[280px] lg:min-h-[420px]" : ""
                } border border-night/5 shadow-soft hover:shadow-[0_30px_60px_-20px_rgba(10,31,68,0.35)] transition-all duration-500`}
              >
                <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <h3 className="mt-6 font-display text-3xl">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed opacity-85 max-w-sm">
                    {pillar.body}
                  </p>
                  {idx === 0 ? (
                    <div className="mt-10 hidden lg:block">
                      <div className="space-y-2">
                        {[
                          "Aïssatou : Tu peux passer ?",
                          "Famille 🏡 : Maman a appelé",
                          "Yann : Ton annonce m'intéresse",
                        ].map((m) => (
                          <div
                            key={m}
                            className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-sm text-sm font-medium"
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <section id="vision" className="py-24 sm:py-32 bg-night text-cream relative overflow-hidden grain">
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-gold/30 via-gold/5 to-transparent blur-3xl halo-drift" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 lg:col-start-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-gold">
            Notre vision
          </span>
          <h2 className="mt-3 font-display text-5xl sm:text-6xl text-balance">
            Le pont entre <em className="italic">deux mondes</em>.
          </h2>
          <p className="mt-6 text-lg text-cream/80 max-w-xl leading-relaxed">
            Pendant que les géants américains pensent leurs apps pour New York
            et que les chinois conçoivent pour Shenzhen, personne ne construit
            pour <strong className="text-gold">Paris-Dakar-Abidjan-Montréal</strong>.
            DIVARC, c&apos;est cette app-là.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              "Mobile Money intégré dès le jour 1",
              "Multi-devise (EUR, XAF, XOF, MAD, CAD)",
              "Interface en français — pas une traduction",
              "Modération adaptée à nos cultures",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-cream/90">{point}</span>
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

function CommunityMarquee() {
  return (
    <section id="communaute" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 mb-8">
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          La communauté
        </span>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl text-night max-w-2xl text-balance">
          Une seule app, <em className="italic">tous</em> les francophones.
        </h2>
      </div>
      <Marquee
        items={[
          "Paris",
          "·",
          "Dakar",
          "·",
          "Abidjan",
          "·",
          "Yaoundé",
          "·",
          "Montréal",
          "·",
          "Casablanca",
          "·",
          "Bruxelles",
          "·",
          "Cotonou",
          "·",
          "Lomé",
          "·",
          "Kinshasa",
          "·",
          "Tunis",
          "·",
          "Lausanne",
          "·",
          "Bamako",
        ]}
      />
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 sm:px-10 pb-24">
      <div className="relative max-w-7xl mx-auto rounded-[36px] overflow-hidden bg-gradient-to-br from-night via-night-soft to-night-muted text-cream p-10 sm:p-16 grain">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-gold/40 to-transparent blur-3xl halo-drift" />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-5xl sm:text-6xl text-balance">
            Rejoins la <em className="italic">beta privée</em>.
          </h2>
          <p className="mt-5 text-lg text-cream/80 max-w-xl">
            Sois parmi les premiers à façonner DIVARC. Accès anticipé, badge
            fondateur permanent, voix dans la roadmap produit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="primary" asChild className="bg-gold text-night hover:bg-gold-soft">
              <Link href="/signup">
                Créer mon compte fondateur
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-cream hover:bg-white/10">
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14">
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
              ["Vision", "#vision"],
              ["Piliers", "#produit"],
              ["Communauté", "#communaute"],
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
