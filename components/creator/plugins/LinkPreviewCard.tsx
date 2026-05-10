"use client";

import { Loader2, X } from "lucide-react";
import Image from "next/image";
import type { PostLinkPreview } from "@/lib/database.types";

/* LinkPreviewCard — preview d'un lien dans le composer.
 *
 * Affichée quand le composer détecte une URL dans le body et que le
 * fetch /api/posts/link-preview a réussi.
 *
 * 3 états :
 *   - loading : skeleton + spinner
 *   - error : null (le composer ne rend rien)
 *   - success : card horizontale (image gauche, titre+desc+site droite)
 */

type Props = {
  preview: PostLinkPreview | null;
  loading?: boolean;
  onRemove: () => void;
};

export function LinkPreviewCard({ preview, loading, onRemove }: Props) {
  if (loading) {
    return (
      <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-bg-soft border border-line p-3 text-[12.5px] text-night-muted">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        Chargement de l&apos;aperçu du lien…
      </div>
    );
  }
  if (!preview) return null;

  return (
    <div className="mt-3.5 relative rounded-xl bg-white border border-line overflow-hidden">
      <div className="flex items-stretch gap-0">
        {preview.image_url ? (
          <div className="relative w-32 sm:w-44 shrink-0 bg-night/5 aspect-square">
            <Image
              src={preview.image_url}
              alt=""
              fill
              sizes="180px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 p-3">
          <p className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted truncate">
            {preview.site_name ?? hostnameFromUrl(preview.url)}
          </p>
          {preview.title ? (
            <p className="mt-0.5 text-[13.5px] font-bold text-night line-clamp-2 leading-snug">
              {preview.title}
            </p>
          ) : null}
          {preview.description ? (
            <p className="mt-1 text-[11.5px] text-night-muted line-clamp-2 leading-snug">
              {preview.description}
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-night/80 text-cream flex items-center justify-center hover:bg-night"
        aria-label="Retirer l'aperçu du lien"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
