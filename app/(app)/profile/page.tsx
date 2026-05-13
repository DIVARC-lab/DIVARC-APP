import {
  Award,
  Briefcase,
  Calendar,
  History,
  IdCard,
  Layers,
  Mail,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getProProfile } from "@/lib/queries/profilePro";
import { countMyProfileViews } from "@/lib/queries/profileViews";
import { safeDate, safeDaysSince } from "@/lib/utils/date";
import { AvatarUpload } from "./AvatarUpload";
import { JournalPanel } from "./JournalPanel";
import { PreferencesForm } from "./PreferencesForm";
import { ProfileForm } from "./ProfileForm";
import { PublicPreview } from "./PublicPreview";
import { SecurityPanel } from "./SecurityPanel";
import { IntroVideoCard } from "./_components/IntroVideoCard";
import { ProHeaderForm } from "./_components/ProHeaderForm";
import { ProSectionsPanel } from "./_components/ProSectionsPanel";
import { ExtendedIdentityPanel } from "@/components/profile/ExtendedIdentityPanel";
import { FacetsManager } from "@/components/profile/FacetsManager";
import { SectionsVisibilityPanel } from "@/components/profile/SectionsVisibilityPanel";

export const metadata = {
  title: "Profil",
};

const TABS = [
  { id: "identite", label: "Identité", icon: IdCard },
  { id: "avance", label: "Avancé", icon: Layers },
  { id: "pro", label: "Pro", icon: Briefcase },
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
          Profil en cours de <em className="italic text-gold-deep">création</em>
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

  const proProfile =
    activeTab === "pro" ? await getProProfile(user.id) : null;
  const profileViewsCount = await countMyProfileViews(user.id);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <ProfileHero profile={profile} fullName={fullName} />

      <StatsBar
        founderRank={profile.founder_rank}
        daysAsMember={daysAsMember}
        signupDate={signupDate}
        profileViewsCount={profileViewsCount}
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

          {activeTab === "avance" ? (
            <>
              <SectionCard
                title="Identité étendue"
                hint="Cover, pronoms, site web, liens externes."
              >
                <ExtendedIdentityPanel profile={profile} />
              </SectionCard>
              <SectionCard
                title="Facettes activées"
                hint="Active les facettes qui te concernent. Tes sections suivront."
              >
                <FacetsManager
                  initialFacets={profile.facets}
                  initialPrimaryFacet={profile.primary_facet}
                />
              </SectionCard>
              <SectionCard
                title="Visibilité granulaire"
                hint="Choisis qui peut voir chaque section de ton profil."
              >
                <SectionsVisibilityPanel
                  initial={profile.sections_visibility}
                />
              </SectionCard>
            </>
          ) : null}

          {activeTab === "pro" && proProfile ? (
            <>
              <SectionCard
                title="Profil pro"
                hint="Phrase d'accroche, badges Open-to-work / Hiring, mode discret."
              >
                <ProHeaderForm profile={profile} />
              </SectionCard>
              <IntroVideoCard
                profile={{
                  id: profile.id,
                  intro_video_url: profile.intro_video_url,
                  intro_video_thumbnail_url: profile.intro_video_thumbnail_url,
                  intro_video_duration_ms: profile.intro_video_duration_ms,
                }}
              />
              <ProSectionsPanel
                experiences={proProfile.experiences}
                education={proProfile.education}
                skills={proProfile.skills}
                languages={proProfile.languages}
                certifications={proProfile.certifications}
              />
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
                Tu fais partie du <em className="italic text-gold">cercle restreint</em> qui façonne DIVARC.
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
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-white shadow-soft">
      {/* Cover navy + ArcDeco gold (handoff Profil toi mobile) */}
      <div className="h-44 sm:h-56 relative bg-night overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-20 -top-24 pointer-events-none"
        >
          <ArcDeco size={380} tone="gold" opacity={0.5} stroke={1.25} />
        </div>
        <div
          aria-hidden
          className="absolute -left-16 -bottom-12 pointer-events-none"
        >
          <ArcDeco size={240} tone="gold" opacity={0.3} stroke={1} />
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-7 -mt-16 sm:-mt-20 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          {/* Avatar gros, ring gold épais */}
          <div className="rounded-full ring-[5px] ring-gold ring-offset-4 ring-offset-white shrink-0 self-start">
            <Avatar
              src={profile.avatar_url}
              fullName={fullName}
              size="xl"
            />
          </div>

          {/* Boutons Modifier / Partager (handoff Profil toi) */}
          <div className="sm:pb-2 flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/profile?tab=identite">Modifier</Link>
            </Button>
            <button
              type="button"
              aria-label="Partager mon profil"
              className="w-9 h-9 rounded-full bg-white border border-line text-night-muted hover:border-gold/50 hover:text-gold-deep flex items-center justify-center transition-colors"
            >
              <Share2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 text-gold-deep text-[10px] font-extrabold uppercase tracking-[0.16em] border border-gold/30">
            <Award className="w-3 h-3" aria-hidden />
            Fondateur
          </span>
          <h1 className="mt-2 font-display italic text-[32px] sm:text-5xl text-night text-balance leading-[1.05]">
            {fullName}
          </h1>
          {profile.username ? (
            <p className="text-sm text-muted-strong mt-1">
              @{profile.username}
              {profile.location ? (
                <>
                  {" · "}
                  {profile.location}
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-sm italic text-muted mt-1">
              Pseudo à choisir
            </p>
          )}
          {profile.bio ? (
            <p className="mt-3 text-night-muted leading-relaxed text-pretty max-w-2xl">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatsBar({
  founderRank,
  daysAsMember,
  signupDate,
  profileViewsCount,
}: {
  founderRank: number | null;
  daysAsMember: number;
  signupDate: Date;
  profileViewsCount: number;
}) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
        label="Vues du profil"
        value={String(profileViewsCount)}
        helper="Cliquer pour voir"
        accent="bg-emerald-50 text-emerald-700"
        href="/profile/views"
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
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper?: string;
  accent: string;
  href?: string;
}) {
  const body = (
    <>
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
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block p-5 rounded-2xl bg-white border border-line hover:border-night/30 transition-colors"
      >
        {body}
      </Link>
    );
  }
  return (
    <article className="p-5 rounded-2xl bg-white border border-line">{body}</article>
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
