"use client";

import { Check, Eye, MapPin, MessageSquareText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type {
  JobApplicationStatus,
  JobApplicationWithApplicant,
} from "@/lib/database.types";
import { APPLICATION_STATUS_META } from "@/lib/utils/jobs";
import { formatRelative } from "@/lib/utils/relativeTime";
import { reviewApplication } from "../../../actions";

const TONE_CLASSES: Record<string, string> = {
  blue: "bg-night/5 text-night",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  neutral: "bg-night/[0.04] text-night-muted",
  muted: "bg-night/[0.04] text-muted",
};

type ApplicantCardProps = {
  application: JobApplicationWithApplicant;
};

export function ApplicantCard({ application }: ApplicantCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const profile = application.applicant;
  const displayName =
    profile?.full_name ?? profile?.username ?? "Candidat·e";
  const statusMeta = APPLICATION_STATUS_META[application.status];

  function handleReview(status: JobApplicationStatus) {
    startTransition(async () => {
      const result = await reviewApplication(application.id, status);
      if (result.ok) {
        toast.success("Statut mis à jour.");
        router.refresh();
      } else {
        toast.error("Action impossible.");
      }
    });
  }

  function handleMessage() {
    if (!profile) return;
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { other_user_id: profile.id },
      );
      if (error || !data) {
        toast.error(
          "Demande d'amitié requise. Va sur le profil pour l'envoyer.",
        );
        return;
      }
      router.push(`/messages/${data}`);
    });
  }

  const canDecide =
    application.status === "pending" || application.status === "reviewed";

  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-white border border-line">
      <div className="flex items-start gap-4">
        <Link href={`/u/${profile?.username ?? ""}`}>
          <Avatar
            src={profile?.avatar_url ?? null}
            fullName={displayName}
            size="lg"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/u/${profile?.username ?? ""}`}
              className="group"
            >
              <p className="font-display text-xl text-night group-hover:text-night-soft truncate">
                {displayName}
              </p>
              {profile?.username ? (
                <p className="text-sm text-muted truncate">
                  @{profile.username}
                </p>
              ) : null}
            </Link>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                TONE_CLASSES[statusMeta.tone] ?? "bg-night/[0.04] text-night-muted"
              }`}
            >
              {statusMeta.label}
            </span>
          </div>

          {profile?.bio ? (
            <p className="mt-2 text-sm text-night-muted line-clamp-2">
              {profile.bio}
            </p>
          ) : null}

          {profile?.location ? (
            <p className="mt-1 text-xs text-muted flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden />
              {profile.location}
            </p>
          ) : null}
        </div>
      </div>

      {application.message ? (
        <blockquote className="mt-4 p-4 rounded-2xl bg-night/[0.03] border border-line text-sm text-night-muted leading-relaxed">
          « {application.message} »
        </blockquote>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>Reçue {formatRelative(application.created_at)}</span>
        <div className="flex flex-wrap gap-2">
          {application.status === "pending" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleReview("reviewed")}
              loading={pending}
            >
              {!pending ? <Eye className="w-3.5 h-3.5" aria-hidden /> : null}
              Marquer lue
            </Button>
          ) : null}
          {canDecide ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleReview("rejected")}
                loading={pending}
                className="text-red-600 hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
                Refuser
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReview("accepted")}
                loading={pending}
              >
                {!pending ? <Check className="w-3.5 h-3.5" aria-hidden /> : null}
                Accepter
              </Button>
            </>
          ) : null}
          {application.status === "accepted" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleMessage}
              loading={pending}
            >
              {!pending ? (
                <MessageSquareText className="w-3.5 h-3.5" aria-hidden />
              ) : null}
              Discuter
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
