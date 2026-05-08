"use client";

import { ImagePlus, Loader2, Send, Type, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { StoryFilter } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { STORY_FILTERS, getFilterCss } from "@/lib/stories/filters";
import { createStory } from "../actions";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const BACKGROUNDS = [
  { id: "from-night via-night-soft to-night-muted", label: "Nuit" },
  { id: "from-gold via-gold-soft to-gold-deep", label: "Or" },
  { id: "from-emerald-700 to-emerald-900", label: "Émeraude" },
  { id: "from-red-600 via-red-700 to-red-900", label: "Rubis" },
  { id: "from-night via-gold-deep to-gold", label: "Aube" },
] as const;

type ComposerMode = "photo" | "text";

type StoryComposerProps = {
  userId: string;
};

export function StoryComposer({ userId }: StoryComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("photo");
  const [photo, setPhoto] = useState<{ url: string; storagePath: string } | null>(
    null,
  );
  const [caption, setCaption] = useState("");
  const [background, setBackground] = useState<string>(BACKGROUNDS[0]!.id);
  const [filter, setFilter] = useState<StoryFilter>("original");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Format invalide.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Fichier trop lourd (8 Mo max).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("stories")
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("stories").getPublicUrl(storagePath);

    setPhoto({ url: publicUrl, storagePath });
    setUploading(false);
  }

  async function removePhoto() {
    if (!photo) return;
    const supabase = createClient();
    await supabase.storage.from("stories").remove([photo.storagePath]);
    setPhoto(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "photo" && !photo) {
      toast.error("Ajoute une photo.");
      return;
    }
    if (mode === "text" && caption.trim().length === 0) {
      toast.error("Écris quelque chose.");
      return;
    }

    const formData = new FormData();
    formData.set("type", mode);
    formData.set("photo_url", mode === "photo" ? photo?.url ?? "" : "");
    formData.set("caption", caption);
    formData.set("background", mode === "text" ? background : "");
    formData.set("filter", mode === "photo" ? filter : "original");

    startTransition(async () => {
      const result = await createStory(formData);
      if (result?.ok === false) {
        toast.error(result.error ?? "Publication impossible.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="inline-flex p-1.5 rounded-2xl bg-night/5 border border-line">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
            mode === "photo"
              ? "bg-white text-night shadow-soft"
              : "text-night-muted hover:text-night",
          )}
        >
          <ImagePlus className="w-4 h-4" aria-hidden />
          Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
            mode === "text"
              ? "bg-white text-night shadow-soft"
              : "text-night-muted hover:text-night",
          )}
        >
          <Type className="w-4 h-4" aria-hidden />
          Texte
        </button>
      </div>

      {mode === "photo" ? (
        <div>
          {photo ? (
            <div className="relative aspect-[4/5] sm:aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-night/5 border border-line">
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="400px"
                className="object-cover"
                style={{ filter: getFilterCss(filter) || undefined }}
                unoptimized
              />
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Retirer"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-red-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full max-w-sm mx-auto aspect-[4/5] sm:aspect-square rounded-3xl border-2 border-dashed border-line bg-night/[0.02] flex flex-col items-center justify-center gap-3 text-night-muted hover:border-night/30 hover:bg-night/5 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-7 h-7 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="w-8 h-8" aria-hidden />
              )}
              <span className="text-sm font-semibold">
                {uploading ? "Téléversement..." : "Choisir une photo"}
              </span>
              <span className="text-xs text-muted">JPG, PNG, WebP · 8 Mo max</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={handleFile}
            className="sr-only"
          />
          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.currentTarget.value)}
            placeholder="Ajoute une légende (facultatif)..."
            maxLength={280}
            className="mt-4 w-full max-w-sm mx-auto block h-11 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />

          {photo ? (
            <div className="mt-4 max-w-sm mx-auto">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted mb-2">
                Filtre
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {STORY_FILTERS.map((f) => {
                  const active = f.id === filter;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={active}
                      className="shrink-0 flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "block w-12 h-16 rounded-xl overflow-hidden bg-gradient-to-br ring-2 transition-all",
                          f.swatch,
                          active
                            ? "ring-gold scale-105"
                            : "ring-transparent hover:ring-line",
                        )}
                        style={{ filter: f.css || undefined }}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          active ? "text-gold-deep" : "text-night-muted",
                        )}
                      >
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              "relative aspect-[4/5] sm:aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br flex items-center justify-center px-6",
              background,
            )}
          >
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.currentTarget.value)}
              placeholder="Écris quelque chose..."
              maxLength={280}
              rows={4}
              className="w-full bg-transparent text-cream font-display text-2xl sm:text-3xl text-center placeholder:text-cream/50 resize-none focus:outline-none leading-tight"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Fond
            </p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackground(bg.id)}
                  aria-pressed={background === bg.id}
                  className={cn(
                    "w-12 h-12 rounded-2xl bg-gradient-to-br transition-all border-2",
                    bg.id,
                    background === bg.id
                      ? "border-night scale-105"
                      : "border-transparent hover:scale-105",
                  )}
                  aria-label={bg.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 max-w-sm mx-auto">
        <p className="text-xs text-muted">Visible 24 h par tes amis</p>
        <Button type="submit" loading={pending}>
          {!pending ? <Send className="w-4 h-4" aria-hidden /> : null}
          Publier
        </Button>
      </div>
    </form>
  );
}
