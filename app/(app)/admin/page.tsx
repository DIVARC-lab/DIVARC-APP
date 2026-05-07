import {
  Award,
  Briefcase,
  ChevronRight,
  MessageSquareText,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import {
  getAdminRecentUsers,
  getAdminStats,
  isCurrentUserAdmin,
} from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/relativeTime";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) notFound();

  const [stats, users] = await Promise.all([
    getAdminStats(),
    getAdminRecentUsers(50),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-gold-deep">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
            Admin
          </span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Cockpit <em className="italic">DIVARC</em>.
          </h1>
          <p className="mt-2 text-muted-strong">
            Vue d&apos;ensemble du produit, modération et stats.
          </p>
        </div>
      </header>

      {stats ? (
        <section>
          <header className="mb-4">
            <h2 className="font-display text-2xl text-night">Vue d&apos;ensemble</h2>
            <p className="text-sm text-muted">
              Tous les chiffres clés du produit.
            </p>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Users}
              label="Profils"
              value={stats.profiles_total}
              hint={`+${stats.profiles_new_7d} ces 7 derniers jours`}
              accent="bg-night/5 text-night"
            />
            <StatCard
              icon={Sparkle}
              label="Posts"
              value={stats.posts_total}
              accent="bg-gold/15 text-gold-deep"
            />
            <StatCard
              icon={ShoppingBag}
              label="Annonces actives"
              value={stats.listings_active}
              accent="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={Briefcase}
              label="Offres d'emploi"
              value={stats.jobs_active}
              accent="bg-night/5 text-night"
            />
            <StatCard
              icon={Sparkle}
              label="Stories actives"
              value={stats.stories_active}
              hint="< 24h"
              accent="bg-cream text-night"
            />
            <StatCard
              icon={MessageSquareText}
              label="Conversations"
              value={stats.conversations_total}
              hint={`${stats.messages_total} messages`}
              accent="bg-night/5 text-night"
            />
            <StatCard
              icon={Send}
              label="Transferts"
              value={stats.transfers_count}
              accent="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={Send}
              label="Volume EUR"
              value={formatPrice(stats.transfers_volume_eur, "EUR")}
              hint="Cumul total"
              accent="bg-gold/15 text-gold-deep"
              isText
            />
          </div>
        </section>
      ) : null}

      <section>
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-night">
              Profils récents ({users.length})
            </h2>
            <p className="text-sm text-muted">
              Les 50 derniers fondateurs DIVARC.
            </p>
          </div>
        </header>

        {users.length === 0 ? (
          <div className="text-center py-10 px-6 rounded-3xl bg-white border border-line">
            <p className="text-muted">Aucun profil pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-line overflow-hidden divide-y divide-line">
            {users.map((profile) => {
              const displayName =
                profile.full_name ?? profile.username ?? "Utilisateur";
              const link = profile.username
                ? `/u/${profile.username}`
                : `/admin?focus=${profile.id}`;
              return (
                <Link
                  key={profile.id}
                  href={link}
                  className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-night/[0.02] transition-colors"
                >
                  <Avatar
                    src={profile.avatar_url}
                    fullName={displayName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-night truncate">
                        {displayName}
                      </p>
                      {profile.founder_rank ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                          <Award className="w-2.5 h-2.5" aria-hidden />#{profile.founder_rank}
                        </span>
                      ) : null}
                      {profile.is_admin ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
                          Admin
                        </span>
                      ) : null}
                      {!profile.onboarded_at ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-widest">
                          Pas onboardé
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted truncate">
                      {profile.username ? `@${profile.username} · ` : ""}
                      {profile.email ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-muted">
                      {formatRelative(profile.created_at)}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 text-muted shrink-0"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="p-6 rounded-3xl bg-night text-cream grain relative overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/30 blur-2xl" />
        <div className="relative">
          <h2 className="font-display text-xl">Donner les droits admin</h2>
          <p className="mt-2 text-sm text-cream/80 max-w-2xl">
            Pour transformer un profil en admin, lance ceci dans Supabase →
            SQL Editor (la modération via l&apos;UI viendra plus tard) :
          </p>
          <pre className="mt-3 p-3 rounded-xl bg-black/30 text-[11px] font-mono text-cream/90 overflow-x-auto">
{`update public.profiles set is_admin = true where username = 'pseudo_a_promouvoir';`}
          </pre>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  isText,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
  isText?: boolean;
}) {
  return (
    <article className="p-5 rounded-2xl bg-white border border-line">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <dd
        className={`mt-3 font-display ${isText ? "text-xl" : "text-3xl"} text-night truncate`}
      >
        {value}
      </dd>
      {hint ? <p className="text-xs text-muted mt-0.5">{hint}</p> : null}
    </article>
  );
}
