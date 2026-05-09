"use client";

import { Loader2 } from "lucide-react";
import { PostComposer } from "@/app/(app)/feed/_components/PostComposer";
import { useCurrentUserProfile } from "@/lib/hooks/useCurrentUserProfile";
import { useCreator } from "../CreatorProvider";

/* PostMode — contenu du ContentCreatorModal en mode "post".
 *
 * Réutilise le PostComposer existant en mode embedded (skipper son
 * ChipTeaser + son Modal interne). Le shell modal externe (étape 3) gère
 * backdrop, fermeture, a11y, swipe-down mobile.
 *
 * Lit le user via useCurrentUserProfile (fetch /api/me) car le modal est
 * monté globalement dans (app)/layout.tsx et ne reçoit pas les props
 * userId/profile depuis les pages individuelles. */
export function PostMode() {
  const { close } = useCreator();
  const me = useCurrentUserProfile();

  if (me.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16">
        <Loader2 className="w-6 h-6 text-night-muted animate-spin" aria-hidden />
        <p className="mt-3 text-sm text-night-muted">Chargement…</p>
      </div>
    );
  }
  if (me.status === "anonymous") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
        <p className="text-sm text-night-muted">
          Tu dois être connecté pour publier un post.
        </p>
      </div>
    );
  }

  return (
    <PostComposer
      embedded
      userId={me.user.id}
      authorName={me.profile?.full_name ?? null}
      authorAvatarUrl={me.profile?.avatar_url ?? null}
      onPublished={close}
    />
  );
}
