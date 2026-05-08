import {
  Briefcase,
  ImageIcon,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Créer",
};

type Option = {
  href: string;
  label: string;
  sub: string;
  icon: typeof Sparkles;
  /** Tailwind classes for the icon tile bg+text. */
  tone: string;
  popular?: boolean;
};

const OPTIONS: Option[] = [
  {
    href: "/feed#composer",
    label: "Publier un post",
    sub: "Texte, photo, sondage",
    icon: Sparkles,
    tone: "bg-night text-cream",
  },
  {
    href: "/marketplace/new",
    label: "Vendre un objet",
    sub: "Mise en ligne en 30 sec.",
    icon: Tag,
    tone: "bg-gold text-night",
    popular: true,
  },
  {
    href: "/jobs/new",
    label: "Publier une offre",
    sub: "CDI, freelance, mission",
    icon: Briefcase,
    tone: "bg-night text-cream",
  },
  {
    href: "/circles/new",
    label: "Organiser un événement",
    sub: "Atelier, meetup, soirée",
    icon: Star,
    tone: "bg-night text-cream",
  },
  {
    href: "/stories/new",
    label: "Story",
    sub: "Visible 24 h",
    icon: ImageIcon,
    tone: "bg-gold text-night",
  },
];

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col">
      <div className="flex-1" aria-hidden />
      <section className="relative bg-bg rounded-t-3xl shadow-[0_-30px_80px_-20px_rgba(10,31,68,0.18)] px-5 pb-10 pt-3 sm:max-w-lg sm:mx-auto sm:rounded-3xl sm:my-10 sm:shadow-[0_24px_60px_-24px_rgba(10,31,68,0.25)] sm:border sm:border-line">
        <div
          aria-hidden
          className="w-10 h-1 bg-line rounded-full mx-auto mb-3"
        />

        <header className="flex items-start justify-between gap-3 mb-5 px-1">
          <div className="min-w-0">
            <KickerLabel>· Que veux-tu créer ?</KickerLabel>
            <DisplayHeading
              size="lg"
              className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              Choisis un <em className="italic text-gold-deep">format</em>.
            </DisplayHeading>
          </div>
          <Link
            href="/feed"
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-night-muted hover:text-night transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </Link>
        </header>

        <ul className="space-y-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <li key={option.label}>
                <Link
                  href={option.href}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl bg-white border transition-colors hover:border-gold/40",
                    option.popular
                      ? "border-gold/40 ring-2 ring-gold/15"
                      : "border-line",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                      option.tone,
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-night truncate">
                        {option.label}
                      </p>
                      {option.popular ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cream text-gold-deep tracking-[0.06em] border border-gold/30">
                          POPULAIRE
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted truncate">{option.sub}</p>
                  </div>
                  <span
                    aria-hidden
                    className="w-7 h-7 rounded-full bg-night/[0.04] flex items-center justify-center text-night-muted shrink-0"
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
