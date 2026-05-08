import {
  Bell,
  Globe,
  IdCard,
  KeySquare,
  Lock,
  MessageSquareText,
  Search,
  Shield,
  Wallet as WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Avatar } from "@/components/ui/Avatar";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Paramètres",
};

type Item = {
  icon: typeof Bell;
  label: string;
  sub: string;
  href?: string;
  trailing?: string;
  accent?: boolean;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? "";

  const compte: Item[] = [
    {
      icon: IdCard,
      label: "Profil et informations",
      sub: profile?.username
        ? `@${profile.username} · ${user.email ?? ""}`
        : user.email ?? "—",
      href: "/profile?tab=identite",
    },
    {
      icon: Lock,
      label: "Confidentialité",
      sub: "Amis · contrôle qui te voit",
      href: "/profile?tab=preferences",
    },
    {
      icon: WalletIcon,
      label: "Wallet et paiements",
      sub: "Comptes · bénéficiaires",
      href: "/wallet",
      accent: true,
    },
  ];

  const activite: Item[] = [
    {
      icon: Bell,
      label: "Notifications",
      sub: "Tout activé · son désactivé la nuit",
      href: "/profile?tab=preferences",
    },
    {
      icon: MessageSquareText,
      label: "Messages",
      sub: "Demandes filtrées · accusés de lecture on",
      href: "/messages",
    },
    {
      icon: Globe,
      label: "Langue",
      sub: "Français (par défaut)",
      trailing: "FR",
    },
  ];

  const securite: Item[] = [
    {
      icon: Shield,
      label: "Sessions actives",
      sub: "Appareils connectés à ton compte",
      href: "/profile?tab=securite",
    },
    {
      icon: KeySquare,
      label: "Mot de passe",
      sub: "Changer ton mot de passe",
      href: "/profile?tab=securite",
    },
  ];

  return (
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-2xl mx-auto w-full pb-12">
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <KickerLabel>Réglages</KickerLabel>
          <DisplayHeading size="lg" italicAll className="mt-2">
            Paramètres
          </DisplayHeading>
        </div>
        <button
          type="button"
          aria-label="Rechercher dans les paramètres"
          className="w-10 h-10 rounded-full bg-white border border-line text-night-muted flex items-center justify-center hover:border-night/30 hover:text-night transition-colors"
        >
          <Search className="w-4 h-4" aria-hidden />
        </button>
      </header>

      {/* Profile hero card — navy with ArcMark watermark */}
      <Link
        href="/profile"
        className="relative block rounded-3xl bg-night text-cream p-4 sm:p-5 mb-8 overflow-hidden hover:bg-night-soft transition-colors"
      >
        <div
          aria-hidden
          className="absolute -right-12 -top-12 pointer-events-none"
        >
          <ArcDeco size={200} tone="gold" opacity={0.45} stroke={1} />
        </div>
        <div className="relative flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url ?? null}
            fullName={fullName}
            size="lg"
            className="ring-2 ring-cream/15"
          />
          <div className="flex-1 min-w-0">
            <p className="font-display italic text-xl truncate">{fullName}</p>
            <p className="text-xs text-cream/70 truncate">
              @{profile?.username ?? "—"} ·{" "}
              {profile?.founder_rank ? "membre fondateur" : "membre"}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center px-3 h-8 rounded-full bg-gold text-night text-xs font-extrabold">
            Voir
          </span>
        </div>
      </Link>

      <SectionGroup title="Compte" items={compte} />
      <SectionGroup title="Activité" items={activite} />
      <SectionGroup title="Sécurité" items={securite} />

      <div className="mt-8 px-2">
        <LogoutButton />
      </div>
    </div>
  );
}

function SectionGroup({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="mb-7">
      <p className="px-2 mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {title}
      </p>
      <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
        {items.map((item) => {
          const Icon = item.icon;
          const Wrapper: React.ElementType = item.href ? Link : "div";
          const props = item.href ? { href: item.href } : {};
          return (
            <li key={item.label}>
              <Wrapper
                {...props}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-night/[0.02] transition-colors"
              >
                <span
                  className={
                    item.accent
                      ? "w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
                      : "w-9 h-9 rounded-xl bg-night/5 text-night flex items-center justify-center shrink-0"
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-night truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted truncate">{item.sub}</p>
                </div>
                {item.trailing ? (
                  <span className="text-xs font-semibold text-night-muted shrink-0">
                    {item.trailing}
                  </span>
                ) : null}
                <span className="text-night-muted shrink-0" aria-hidden>
                  →
                </span>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
