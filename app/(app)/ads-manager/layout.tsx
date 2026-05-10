import {
  BarChart3,
  Building2,
  CreditCard,
  Layers,
  Megaphone,
  Settings,
  Target,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* Layout /ads-manager — sidebar permanente style "outil pro" (Meta Ads
 * Manager / Stripe Dashboard).
 *
 * Densité informationnelle accrue vs l'app sociale principale. Identité
 * DIVARC conservée (navy + gold). Mode sombre laissé à V2 pour ne pas
 * doubler le boulot CSS.
 *
 * Auth : redirige /login si pas connecté. La RLS gère le reste — un
 * user sans ad_account_users associé verra des listes vides mais peut
 * toujours créer son business + ad_account.
 */
export default async function AdsManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg-soft flex">
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-line flex-col sticky top-0 h-screen">
        <div className="px-5 pt-5 pb-3">
          <Link href="/feed" className="flex items-center gap-2 group">
            <span className="font-display text-[20px] font-normal tracking-[-0.02em] text-night">
              DIVARC
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Ads
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-2.5 py-2 overflow-y-auto">
          <NavItem
            href="/ads-manager"
            icon={Megaphone}
            label="Vue d'ensemble"
          />
          <NavItem
            href="/ads-manager/campaigns"
            icon={Layers}
            label="Campagnes"
          />
          <NavItem
            href="/ads-manager/audiences"
            icon={Target}
            label="Audiences"
          />
          <NavItem
            href="/ads-manager/analytics"
            icon={BarChart3}
            label="Analytics"
          />
          <NavItem
            href="/ads-manager/billing"
            icon={CreditCard}
            label="Facturation"
          />
          <div className="mt-5 pt-3 border-t border-line">
            <NavItem
              href="/ads-manager/business"
              icon={Building2}
              label="Compte entreprise"
            />
            <NavItem
              href="/ads-manager/team"
              icon={Users2}
              label="Équipe"
            />
            <NavItem
              href="/ads-manager/settings"
              icon={Settings}
              label="Paramètres"
            />
          </div>
        </nav>
        <div className="px-5 py-4 border-t border-line">
          <Link
            href="/feed"
            className="text-[12px] font-bold text-night-muted hover:text-night transition-colors"
          >
            ← Retour à DIVARC
          </Link>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-line px-4 py-3 flex items-center justify-between">
          <Link href="/ads-manager" className="flex items-center gap-2">
            <span className="font-display text-[18px] text-night">DIVARC</span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Ads
            </span>
          </Link>
          <Link
            href="/feed"
            className="text-[11px] font-bold text-night-muted"
          >
            ← Feed
          </Link>
        </header>
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Megaphone;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-night-muted hover:bg-bg-soft hover:text-night transition-colors"
    >
      <Icon className="w-4 h-4" aria-hidden />
      {label}
    </Link>
  );
}
