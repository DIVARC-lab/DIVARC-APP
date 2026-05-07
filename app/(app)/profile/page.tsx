import {
  Award,
  Calendar,
  History,
  IdCard,
  Mail,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { safeDate, safeDaysSince } from "@/lib/utils/date";
import { AvatarUpload } from "./AvatarUpload";
import { JournalPanel } from "./JournalPanel";
import { PreferencesForm } from "./PreferencesForm";
import { ProfileForm } from "./ProfileForm";
import { PublicPreview } from "./PublicPreview";
import { SecurityPanel } from "./SecurityPanel";

export const metadata = {
  title: "Profil",
};

const TABS = [
  { id: "identite", label: "Identité", icon: IdCard },
  { id: "preferences", label: "Préférences", icon: Settings2 },
  { id: "securite", label: "Sécurité", icon: Shield },
  { id: "journal", label: "Journal", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];

type SearchParams = Promise<{ tab?: string }>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-night">
          Profil en cours de création
        </h1>
        <p className="mt-3 text-muted max-w-md">
          Ton profil n&apos;a pas encore été créé. Si tu viens de t&apos;inscrire,
          recharge la page dans quelques secondes.
        </p>
      </div>
    );
  }

  const fullName = profile.full_name ?? user.email?.split("@")[0] ?? "";
  const { tab } = await searchParams;
  const activeTab: TabId =
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "identite";

  const signupDate = safeDate(user.created_at);
  const daysAsMember = safeDaysSince(user.created_at);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <ProfileHero profile={profile} fullName={fullName} />

      <StatsBar
        founderRank={profile.founder_rank}
        daysAsMember={daysAsMember}
        signupDate={signupDate}
      />

      <Tabs
        tabs={[...TABS]}
        activeId={activeTab}
        pathname="/profile"
        defaultTab="identite"
        paramName="tab"
        className="mx-auto"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "identite" ? (
            <>
              <SectionCard
                title="Photo de profil"
                hint="JPG, PNG ou WebP — 4 Mo max"
              >
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile.avatar_url}
                  fullName={fullName}
                />
              </SectionCard>
              <SectionCard
                title="Informations publiques"
                hint="Visibles par les autres utilisateurs."
              >
                <ProfileForm profile={profile} />
              </SectionCard>
            </>
          ) : null}

          {activeTab === "preferences" ? (
            <SectionCard
              title="Préférences"
              hint="Ajuste DIVARC à ta région et tes habitudes."
            >
              <PreferencesForm profile={profile} />
            </SectionCard>
          ) : null}

          {activeTab === "securite" ? (
            <SecurityPanel
              email={user.email ?? ""}
              lastSignInAt={user.last_sign_in_at ?? null}
            />
          ) : null}

          {activeTab === "journal" ? (
            <SectionCard
              title="Mon journal DIVARC"
              hint="L'histoire de ton parcours sur la super-app."
            >
              <JournalPanel profile={profile} signupDate={signupDate} />
            </SectionCard>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <PublicPreview profile={profile} email={user.email ?? ""} />

          <article className="p-6 rounded-3xl bg-night text-cream border border-night/40 shadow-soft grain relative overflow-hidden">
            <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gold/30 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-gold">
                <Sparkles className="w-4 h-4" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  Fondateur permanent
                </span>
              </div>
              <p className="mt-3 font-display text-xl leading-snug">
                Tu fais partie du cercle restreint qui façonne DIVARC.
              </p>
              <p className="mt-2 text-xs text-cream/70 leading-relaxed">
                Ton avis compte directement dans la roadmap. Réponds aux
                sondages internes et accède en avant-première aux nouvelles
                fonctionnalités.
              </p>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}

function ProfileHero({
  profile,
  fullName,
}: {
  profile: { avatar_url: string | null; username: string | null; bio: string | null; location: string | null };
  fullName: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-white">
      <div className="h-40 sm:h-56 relative bg-gradient-to-br from-night via-night-soft to-night-muted grain">
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 800 200"
          fill="none"
          aria-hidden
        >
          <defs>
            <pattern
              id="arc-pattern"
              x="0"
              y="0"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 40 Q 40 0 80 40 Q 40 80 0 40 Z"
                stroke="#F4B942"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="800" height="200" fill="url(#arc-pattern)" />
        </svg>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night via-transparent to-transparent" />
      </div>
      <div className="px-6 sm:px-10 pb-7 -mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="flex items-end gap-5">
          <div className="relative rounded-full ring-4 ring-white p-1 bg-gradient-to-br from-gold via-gold-soft to-gold-deep">
            <div className="rounded-full bg-white">
              <Avatar
                src={profile.avatar_url}
                fullName={fullName}
                size="xl"
              />
            </div>
          </div>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                <Award className="w-3 h-3" aria-hidden />
                Fondateur
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-night text-balance">
              {fullName}
            </h1>
            {profile.username ? (
              <p className="text-sm text-muted">@{profile.username}</p>
            ) : (
              <p className="text-sm italic text-muted">Pseudo à choisir</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar({
  founderRank,
  daysAsMember,
  signupDate,
}: {
  founderRank: number | null;
  daysAsMember: number;
  signupDate: Date;
}) {
  return (
    <dl className="grid sm:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        icon={Award}
        label="Rang fondateur"
        value={founderRank ? `#${founderRank}` : "—"}
        accent="bg-gold/15 text-gold-deep"
      />
      <Stat
        icon={Calendar}
        label="Membre depuis"
        value={`J + ${daysAsMember}`}
        helper={signupDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        accent="bg-night/10 text-night"
      />
      <Stat
        icon={Mail}
        label="Connexions"
        value="0"
        helper="dispo au sprint 3"
        accent="bg-emerald-50 text-emerald-700"
      />
      <Stat
        icon={Sparkles}
        label="Badges"
        value="2"
        helper="Fondateur · Précurseur"
        accent="bg-cream text-night"
      />
    </dl>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper?: string;
  accent: string;
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
      <dd className="mt-3 font-display text-2xl text-night">{value}</dd>
      {helper ? <p className="text-xs text-muted mt-0.5">{helper}</p> : null}
    </article>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <header className="mb-6">
        <h2 className="font-display text-2xl text-night">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </header>
      {children}
    </article>
  );
}
