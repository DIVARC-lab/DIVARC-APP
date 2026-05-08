import { Lock, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { previewInvitation } from "@/lib/queries/circle_invitations";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import type { CircleColor } from "@/lib/database.types";
import { InvitationAcceptButton } from "./InvitationAcceptButton";

export const metadata = {
  title: "Invitation",
};

type Params = Promise<{ token: string }>;

const COLOR_HERO: Record<CircleColor, string> = {
  gold: "bg-gradient-to-br from-gold via-gold-soft to-gold-deep text-night",
  navy: "bg-gradient-to-br from-night via-night-soft to-night-muted text-cream",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-800 text-cream",
  rose: "bg-gradient-to-br from-rose-400 to-rose-700 text-cream",
  violet: "bg-gradient-to-br from-violet-400 to-violet-700 text-cream",
  cream: "bg-gradient-to-br from-cream via-bg to-gold/30 text-night",
};

export default async function InvitePage({ params }: { params: Params }) {
  const { token } = await params;
  const preview = await previewInvitation(token);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10">
        <div className="max-w-md w-full text-center">
          <KickerLabel>Lien invalide</KickerLabel>
          <DisplayHeading size="lg" className="mt-2">
            Cette invitation n'est <em className="italic text-gold-deep">plus active</em>.
          </DisplayHeading>
          <p className="mt-3 text-muted-strong">
            Le lien a peut-être expiré, été révoqué, ou toutes les places sont
            prises. Demande à un membre de t'envoyer un nouveau lien.
          </p>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <Link href="/circles">Voir les cercles publics</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tone = COLOR_HERO[preview.color ?? "gold"];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-lg w-full">
        <KickerLabel>Tu es invitéᐧe</KickerLabel>

        <article
          className={cn(
            "mt-3 rounded-3xl p-7 flex items-center gap-5 shadow-soft",
            tone,
          )}
        >
          <span
            aria-hidden
            className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl shrink-0"
          >
            {preview.emoji ?? preview.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-[10px] font-extrabold uppercase tracking-[0.18em]",
                preview.color === "navy" ||
                  preview.color === "emerald" ||
                  preview.color === "rose" ||
                  preview.color === "violet"
                  ? "text-cream/85"
                  : "text-night/85",
              )}
            >
              {preview.is_private ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" aria-hidden /> · Cercle privé
                </span>
              ) : (
                "· Cercle public"
              )}
            </p>
            <h1 className="font-display italic text-3xl leading-tight mt-1">
              {preview.name}
            </h1>
            <p
              className={cn(
                "text-sm mt-1",
                preview.color === "navy" ||
                  preview.color === "emerald" ||
                  preview.color === "rose" ||
                  preview.color === "violet"
                  ? "text-cream/80"
                  : "text-night/80",
              )}
            >
              {preview.members_count} membre
              {preview.members_count > 1 ? "s" : ""}
            </p>
          </div>
        </article>

        {preview.description ? (
          <p className="mt-6 text-sm leading-relaxed text-night-muted whitespace-pre-line">
            {preview.description}
          </p>
        ) : null}

        <div className="mt-8">
          {user ? (
            <InvitationAcceptButton token={token} />
          ) : (
            <div className="rounded-2xl bg-white border border-line p-5 text-center">
              <p className="text-sm text-night-muted leading-relaxed">
                Connecte-toi pour rejoindre <strong className="text-night">{preview.name}</strong>.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <Button asChild>
                  <Link href="/login">
                    <LogIn className="w-4 h-4" aria-hidden />
                    Se connecter
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/signup">
                    <UserPlus className="w-4 h-4" aria-hidden />
                    Créer un compte
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {preview.expires_at ? (
          <p className="mt-4 text-[11px] text-muted text-center">
            Lien valable jusqu'au{" "}
            {new Date(preview.expires_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
