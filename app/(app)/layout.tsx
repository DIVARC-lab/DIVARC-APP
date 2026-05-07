import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Briefcase,
  Compass,
  Home,
  MessageSquareText,
  Sparkles,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: typeof Home;
  available: boolean;
}> = [
  { href: "/dashboard", label: "Accueil", icon: Home, available: true },
  { href: "/profile", label: "Profil", icon: User, available: true },
  {
    href: "#",
    label: "Discussions",
    icon: MessageSquareText,
    available: false,
  },
  { href: "#", label: "Marché", icon: ShoppingBag, available: false },
  { href: "#", label: "Emploi", icon: Briefcase, available: false },
  { href: "#", label: "Découvrir", icon: Compass, available: false },
  { href: "#", label: "Paiements", icon: Wallet, available: false },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const fullName =
    profile?.full_name ?? (user.email?.split("@")[0] ?? "");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-line bg-white/60 backdrop-blur-md sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-line">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={36} />
            <span className="font-display text-2xl text-night">DIVARC</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-0.5" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.available ? item.href : "#"}
                aria-disabled={!item.available || undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  item.available
                    ? "text-night-muted hover:bg-night/5 hover:text-night"
                    : "text-muted/70 cursor-default"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {!item.available ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep">
                    Bientôt
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-night/5 transition-colors"
          >
            <Avatar
              src={profile?.avatar_url ?? null}
              fullName={fullName}
              size="md"
            />
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-semibold text-night truncate">
                {fullName}
              </p>
              <p className="text-xs text-muted truncate">
                {profile?.username ? `@${profile.username}` : user.email}
              </p>
            </div>
          </Link>
          <div className="mt-2 px-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="lg:hidden px-6 py-4 border-b border-line bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-display text-xl text-night">DIVARC</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Avatar
                src={profile?.avatar_url ?? null}
                fullName={fullName}
                size="sm"
              />
            </Link>
          </div>
        </header>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-line bg-cream/30 lg:bg-transparent">
          <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
          <p className="text-xs font-medium text-night-muted">
            <span className="font-semibold text-night">Beta privée</span> ·
            Tu fais partie des fondateurs. Badge permanent.
          </p>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
