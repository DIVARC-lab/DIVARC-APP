import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Logo";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-line">
        <Wordmark />
        <LogoutButton />
      </header>

      <main className="flex-1 px-6 sm:px-10 py-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl font-bold tracking-tight text-night">
          Bonjour, {fullName} 👋
        </h1>
        <p className="mt-2 text-muted">Bienvenue sur ton tableau de bord.</p>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="p-6 rounded-2xl bg-white border border-line"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-night">
                  {mod.title}
                </h3>
                <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gold/15 text-night-muted">
                  Bientôt
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{mod.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-night text-white">
          <p className="text-sm font-semibold tracking-wide uppercase text-gold mb-2">
            Ton compte
          </p>
          <p className="text-sm opacity-80">Email : {user.email}</p>
          <p className="text-sm opacity-80">User ID : {user.id}</p>
        </div>
      </main>
    </div>
  );
}

const modules = [
  {
    title: "Messagerie",
    desc: "Discute avec tes contacts en toute sécurité. Disponible au sprint 3.",
  },
  {
    title: "Marketplace",
    desc: "Achète, vends, échange dans ta communauté. Disponible au sprint 4.",
  },
  {
    title: "Emploi",
    desc: "Trouve un job ou recrute. Disponible au sprint 5.",
  },
  {
    title: "Contenu",
    desc: "Partage ta vie sans algo toxique. Disponible au sprint 6.",
  },
  {
    title: "Paiements",
    desc: "Stripe + Mobile Money. Disponible au sprint 5.",
  },
  {
    title: "Profil",
    desc: "Personnalise ton identité DIVARC.",
  },
];
