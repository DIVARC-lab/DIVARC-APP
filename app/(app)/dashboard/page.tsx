import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  CircleDashed,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ArcMark } from "@/components/marketing/ArcMark";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { safeFormatDate } from "@/lib/utils/date";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const fullName =
    profile?.full_name ?? (user.email?.split("@")[0] ?? "");

  const checklist = [
    {
      id: "fullName",
      label: "Renseigne ton nom complet",
      done: Boolean(profile?.full_name),
    },
    {
      id: "username",
      label: "Choisis un pseudo unique",
      done: Boolean(profile?.username),
    },
    {
      id: "avatar",
      label: "Ajoute une photo de profil",
      done: Boolean(profile?.avatar_url),
    },
    {
      id: "bio",
      label: "Écris une courte bio",
      done: Boolean(profile?.bio),
    },
    {
      id: "location",
      label: "Indique ta ville",
      done: Boolean(profile?.location),
    },
  ];

  const completed = checklist.filter((step) => step.done).length;
  const completion = Math.round((completed / checklist.length) * 100);

  const memberSince = safeFormatDate(user.created_at, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Container maxWidth="wide" paddingX="page" paddingY="4xl">
      <Stack gap="3xl">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-night via-night-soft to-night-muted text-cream p-8 sm:p-12 grain">
        <div className="pointer-events-none absolute -top-32 -right-24 opacity-80">
          <ArcMark size={400} animate={false} />
        </div>
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream/10 backdrop-blur-sm text-xs font-semibold tracking-widest uppercase text-cream">
            <Sparkles className="w-3 h-3 text-gold" aria-hidden />
            Fondateur · Beta privée
          </span>
          <h1 className="mt-5 font-display text-4xl sm:text-6xl text-balance leading-[1.05]">
            Bonjour, <em className="italic text-gold-deep">{fullName.split(" ")[0]}</em>.
          </h1>
          <p className="mt-4 text-cream/75 max-w-lg">
            Ton espace DIVARC se construit autour de toi. Complète ton profil
            et explore ce qui arrive bientôt.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              variant="primary"
              size="lg"
              className="bg-gold text-night hover:bg-gold-soft"
            >
              <Link href="/profile">
                Compléter mon profil
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <article className="lg:col-span-2 p-7 rounded-3xl bg-white border border-line shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-night">
                Ton profil DIVARC
              </h2>
              <p className="mt-1 text-sm text-muted">
                Plus il est complet, plus tu seras trouvable par tes amis.
              </p>
            </div>
            <div
              className="relative w-16 h-16 shrink-0"
              role="img"
              aria-label={`Profil complété à ${completion} %`}
            >
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e6e9f0"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#0A1F44"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(completion / 100) * 175.93} 175.93`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-night">
                {completion}%
              </span>
            </div>
          </div>

          <ul className="mt-6 space-y-2">
            {checklist.map((step) => (
              <li
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  step.done ? "bg-emerald-50/60" : "bg-night/[0.02]"
                }`}
              >
                {step.done ? (
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-600 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <CircleDashed
                    className="w-5 h-5 text-muted shrink-0"
                    aria-hidden
                  />
                )}
                <span
                  className={`text-sm ${
                    step.done ? "text-emerald-900 line-through opacity-70" : "text-night"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="p-7 rounded-3xl bg-gradient-to-br from-cream via-bg to-bg border border-gold/30 shadow-soft">
          <div className="flex items-center gap-3">
            <Avatar
              src={profile?.avatar_url ?? null}
              fullName={fullName}
              size="lg"
            />
            <div className="min-w-0">
              <p className="font-display text-xl text-night truncate">
                {fullName}
              </p>
              {profile?.username ? (
                <p className="text-sm text-muted">@{profile.username}</p>
              ) : (
                <p className="text-sm text-muted italic">Pseudo à choisir</p>
              )}
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <dt className="text-muted">Statut</dt>
              <dd className="font-semibold text-night flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Fondateur
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <dt className="text-muted">Membre depuis</dt>
              <dd className="font-medium text-night flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted" aria-hidden />
                {memberSince}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Email</dt>
              <dd
                className="font-medium text-night truncate max-w-[160px]"
                title={user.email ?? ""}
              >
                {user.email}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl text-night">Roadmap</h2>
            <p className="text-sm text-muted">
              Ce qui arrive sur DIVARC dans les prochaines semaines.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROADMAP.map((item) => {
            const Icon = item.icon;
            const innerContent = (
              <>
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.iconBg}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${item.iconColor}`}
                      aria-hidden
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      item.href
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-night/5 text-night-muted"
                    }`}
                  >
                    {item.href ? "Disponible" : `Sprint ${item.sprint}`}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl text-night">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {item.body}
                </p>
              </>
            );
            const className =
              "group relative p-6 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all block";
            if (item.href) {
              return (
                <Link key={item.title} href={item.href} className={className}>
                  {innerContent}
                </Link>
              );
            }
            return (
              <article key={item.title} className={className}>
                {innerContent}
              </article>
            );
          })}
        </div>
      </section>
      </Stack>
    </Container>
  );
}

const ROADMAP: ReadonlyArray<{
  title: string;
  body: string;
  sprint: number;
  icon: typeof MessageSquareText;
  iconBg: string;
  iconColor: string;
  href?: string;
}> = [
  {
    title: "Discussions",
    body: "Messagerie chiffrée 1-1, accusés de lecture en temps réel, brouillons sauvegardés.",
    sprint: 3,
    icon: MessageSquareText,
    iconBg: "bg-night/10",
    iconColor: "text-night",
    href: "/messages",
  },
  {
    title: "Marché",
    body: "Annonces locales avec photos, multi-devise, contact via la messagerie.",
    sprint: 4,
    icon: ShoppingBag,
    iconBg: "bg-gold/15",
    iconColor: "text-gold-deep",
    href: "/marketplace",
  },
  {
    title: "Paiements",
    body: "Stripe + Wave + Orange Money. Transferts entre francophones.",
    sprint: 5,
    icon: Wallet,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
  {
    title: "Emploi",
    body: "Profil pro, missions courtes, recrutement local et freelance.",
    sprint: 6,
    icon: Briefcase,
    iconBg: "bg-night/10",
    iconColor: "text-night",
  },
  {
    title: "Contenu",
    body: "Stories, posts, vidéos courtes. Sans algorithme toxique.",
    sprint: 7,
    icon: Sparkles,
    iconBg: "bg-gold/15",
    iconColor: "text-gold-deep",
  },
  {
    title: "Mini-apps",
    body: "L'écosystème DIVARC s'étend. Services, jeux, communautés.",
    sprint: 8,
    icon: Sparkles,
    iconBg: "bg-cream",
    iconColor: "text-night",
  },
];
