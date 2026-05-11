"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateExtendedIdentity } from "@/app/(app)/profile/actions";
import { cn } from "@/lib/utils/cn";
import type {
  Profile,
  ProfileCoverGradient,
  ProfileSocialLink,
} from "@/lib/database.types";
import { CoverUpload } from "./CoverUpload";
import { SocialLinksEditor } from "./SocialLinksEditor";

/* ExtendedIdentityPanel — section "Identité étendue" pour le tab Identité
 * du /profile. Couvre les nouveaux champs V2 :
 *   - cover_photo_url + cover_gradient
 *   - pronouns
 *   - website
 *   - headline (déjà existant dans ProHeaderForm, mais ici on l'inclut
 *     pour cohérence — l'user a le choix)
 *   - social_links
 *
 * Le save part en server action updateExtendedIdentity. Pas d'auto-save
 * dans V1 (économise les actions). User clique "Enregistrer" explicit. */

type Props = {
  profile: Pick<
    Profile,
    | "id"
    | "pronouns"
    | "cover_photo_url"
    | "cover_gradient"
    | "website"
    | "headline"
    | "social_links"
  >;
};

export function ExtendedIdentityPanel({ profile }: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(
    profile.cover_photo_url,
  );
  const [coverGradient, setCoverGradient] = useState<ProfileCoverGradient | null>(
    profile.cover_gradient,
  );
  const [pronouns, setPronouns] = useState<string>(profile.pronouns ?? "");
  const [website, setWebsite] = useState<string>(profile.website ?? "");
  const [headline, setHeadline] = useState<string>(profile.headline ?? "");
  const [socialLinks, setSocialLinks] = useState<ProfileSocialLink[]>(
    profile.social_links ?? [],
  );
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      if (coverUrl) formData.set("cover_photo_url", coverUrl);
      if (coverGradient) formData.set("cover_gradient", coverGradient);
      formData.set("pronouns", pronouns);
      formData.set("website", website);
      formData.set("headline", headline);
      formData.set("social_links", JSON.stringify(socialLinks));
      const res = await updateExtendedIdentity(undefined, formData);
      if (res.status === "success") {
        toast.success(res.message ?? "Identité étendue mise à jour.");
      } else if (res.status === "error") {
        toast.error(res.message ?? "Erreur.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Cover */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
          Cover du profil
        </h3>
        <CoverUpload
          userId={profile.id}
          currentUrl={coverUrl}
          currentGradient={coverGradient}
          onChange={(url, gradient) => {
            setCoverUrl(url);
            setCoverGradient(gradient);
          }}
        />
      </section>

      {/* Headline + pronouns + website */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
          Présentation rapide
        </h3>
        <div>
          <label className="block text-[12.5px] font-semibold text-night mb-1.5">
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 220))}
            placeholder="Ex: Full-stack Dev · Founder GlobalCleanHome · Auteur"
            maxLength={220}
            className="w-full px-3 h-10 rounded-lg border border-line bg-white text-[13.5px] text-night focus:border-gold-deep focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-night-dim text-right tabular-nums">
            {headline.length}/220
          </p>
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-night mb-1.5">
            Pronoms{" "}
            <span className="text-[11px] text-night-dim font-normal">
              (optionnel)
            </span>
          </label>
          <input
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value.slice(0, 30))}
            placeholder="Ex: il/lui, elle/elle, iel"
            maxLength={30}
            className="w-full px-3 h-10 rounded-lg border border-line bg-white text-[13.5px] text-night focus:border-gold-deep focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-night mb-1.5">
            Site web principal
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://exemple.com"
            className="w-full px-3 h-10 rounded-lg border border-line bg-white text-[13.5px] text-night focus:border-gold-deep focus:outline-none"
          />
        </div>
      </section>

      {/* Social links */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
          Liens externes ({socialLinks.length}/15)
        </h3>
        <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
      </section>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-line">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className={cn(
            "h-10 px-5 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5",
            pending
              ? "bg-night/10 text-night-muted cursor-wait"
              : "bg-night text-cream hover:bg-night-soft",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Enregistrement…
            </>
          ) : (
            "Enregistrer l'identité"
          )}
        </button>
      </div>
    </div>
  );
}
