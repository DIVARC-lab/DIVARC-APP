import Link from "next/link";
import { Wordmark } from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-line">
        <Wordmark />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-night hover:text-night-soft"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold rounded-full bg-night text-white hover:bg-night-soft transition"
          >
            S&apos;inscrire
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="px-6 sm:px-10 py-20 sm:py-28 max-w-6xl mx-auto w-full">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-night/5 text-night text-xs font-semibold tracking-wide uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
              Bientôt disponible
            </span>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-night leading-[1.05]">
              Tout. <span className="text-gold">Au même endroit.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-2xl">
              DIVARC, la super-app francophone qui réunit messagerie,
              marketplace, emploi, contenu et paiements. Une seule application
              pour ta vraie vie.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 rounded-full bg-night text-white font-semibold hover:bg-night-soft transition"
              >
                Créer un compte
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-full border border-night/15 text-night font-semibold hover:bg-night/5 transition"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 sm:px-10 py-16 max-w-6xl mx-auto w-full">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white border border-line hover:border-night/20 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center mb-4">
                  <span className="w-2 h-2 rounded-full bg-gold"></span>
                </div>
                <h3 className="text-lg font-semibold text-night">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-6 sm:px-10 py-8 border-t border-line">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <Wordmark className="opacity-80" />
          <p>© {new Date().getFullYear()} DIVARC. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Messagerie sécurisée",
    desc: "Discute avec tes amis, ta famille et tes collègues en toute confidentialité.",
  },
  {
    title: "Marketplace locale",
    desc: "Vends, achète, échange. Comme Vinted, mais autour de toi.",
  },
  {
    title: "Réseau professionnel",
    desc: "Trouve un emploi, publie une annonce, développe ton business.",
  },
  {
    title: "Création de contenu",
    desc: "Partage ta vie en photos, vidéos, stories. Sans algorithme toxique.",
  },
  {
    title: "Paiements & transferts",
    desc: "Envoie de l'argent à tes proches en France et en Afrique.",
  },
  {
    title: "Communauté francophone",
    desc: "Une app pensée pour les 320M de francophones du monde entier.",
  },
];
