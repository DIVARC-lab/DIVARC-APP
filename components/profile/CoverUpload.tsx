"use client";

import { ImagePlus, Loader2, Palette, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { COVER_GRADIENTS } from "@/lib/profile/coverHelpers";
import type { ProfileCoverGradient } from "@/lib/database.types";

/* CoverUpload — upload image cover (ratio 4:1) OU sélection gradient.
 *
 * Workflow image :
 *   - File input → preview en mémoire → upload Supabase Storage
 *   - Bucket "avatars" (existant, public)
 *   - Path : <user_id>/cover-<uuid>.<ext>
 *   - Max 8MB, formats jpeg/png/webp
 *
 * Workflow gradient :
 *   - Click sur swatch → onChange(null, gradient_id)
 *   - 9 presets DIVARC
 *
 * État vidé via X dans le coin → onChange(null, null) = retour défaut. */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  userId: string;
  currentUrl: string | null;
  currentGradient: ProfileCoverGradient | null;
  onChange: (
    url: string | null,
    gradient: ProfileCoverGradient | null,
  ) => void;
};

const GRADIENT_LABELS: Record<ProfileCoverGradient, string> = {
  navy_gold: "Navy → Or",
  sunset: "Sunset",
  ocean: "Océan",
  forest: "Forêt",
  rose: "Rose",
  aurora: "Aurora",
  cream_navy: "Crème → Navy",
  noir: "Noir",
  cyber: "Cyber",
};

export function CoverUpload({
  userId,
  currentUrl,
  currentGradient,
  onChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showGradients, setShowGradients] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Format non supporté (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Image trop lourde (max ${MAX_BYTES / 1024 / 1024}MB).`);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/cover-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onChange(data.publicUrl, null);
      toast.success("Cover mise à jour.");
    } catch (err) {
      console.error("[CoverUpload]", err);
      toast.error("Upload échoué.");
    } finally {
      setUploading(false);
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  }

  /* Preview : image > gradient > default */
  const preview = currentUrl
    ? { type: "image" as const, url: currentUrl }
    : currentGradient
      ? { type: "gradient" as const, css: COVER_GRADIENTS[currentGradient] }
      : { type: "gradient" as const, css: COVER_GRADIENTS.navy_gold };

  return (
    <div className="space-y-3">
      {/* Aperçu */}
      <div
        className="relative aspect-[4/1] rounded-2xl overflow-hidden bg-night/5"
        style={preview.type === "gradient" ? { backgroundImage: preview.css } : undefined}
      >
        {preview.type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview.url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}

        {/* Actions top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={handleSelect}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 h-9 rounded-full bg-white/95 text-night text-[12px] font-semibold flex items-center gap-1.5 shadow-soft hover:bg-white"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" aria-hidden />
            )}
            {currentUrl ? "Changer" : "Importer"}
          </button>
          <button
            type="button"
            onClick={() => setShowGradients((v) => !v)}
            className="px-3 h-9 rounded-full bg-white/95 text-night text-[12px] font-semibold flex items-center gap-1.5 shadow-soft hover:bg-white"
          >
            <Palette className="w-3.5 h-3.5" aria-hidden />
            Dégradé
          </button>
          {(currentUrl || currentGradient) && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              aria-label="Retirer la cover"
              className="w-9 h-9 rounded-full bg-white/95 text-red-600 flex items-center justify-center shadow-soft hover:bg-white"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Gradient picker */}
      {showGradients ? (
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {(Object.keys(COVER_GRADIENTS) as ProfileCoverGradient[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange(null, id);
                setShowGradients(false);
              }}
              aria-label={GRADIENT_LABELS[id]}
              className={cn(
                "aspect-square rounded-xl border-2 transition-colors",
                currentGradient === id
                  ? "border-gold-deep ring-2 ring-gold-deep/30"
                  : "border-line hover:border-night/30",
              )}
              style={{ backgroundImage: COVER_GRADIENTS[id] }}
            />
          ))}
        </div>
      ) : null}

      <p className="text-[11.5px] text-night-dim">
        Cover affichée en ratio 4:1 sur ton profil. JPEG, PNG ou WebP (max 8MB).
        Pas d&apos;image ? Choisis un dégradé.
      </p>
    </div>
  );
}
