"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 8;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

export type UploadedPhoto = {
  url: string;
  position: number;
  storagePath: string;
};

type PhotoUploaderProps = {
  userId: string;
  initial?: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
};

export function PhotoUploader({
  userId,
  initial = [],
  onChange,
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(next: UploadedPhoto[]) {
    setPhotos(next);
    onChange(next);
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`${MAX_PHOTOS} photos maximum.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const uploaded: UploadedPhoto[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`Format invalide pour ${file.name}.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name} trop lourde (8 Mo max).`);
        continue;
      }

      const ext = file.type.split("/")[1] ?? "jpg";
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("listings")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        toast.error(`Échec : ${file.name}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("listings").getPublicUrl(storagePath);

      uploaded.push({
        url: publicUrl,
        position: photos.length + uploaded.length,
        storagePath,
      });
    }

    if (uploaded.length > 0) {
      update([...photos, ...uploaded]);
      toast.success(
        `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} ajoutée${uploaded.length > 1 ? "s" : ""}.`,
      );
    }
    setUploading(false);
  }

  async function handleRemove(photo: UploadedPhoto) {
    const supabase = createClient();
    await supabase.storage.from("listings").remove([photo.storagePath]);
    const next = photos
      .filter((p) => p.storagePath !== photo.storagePath)
      .map((p, idx) => ({ ...p, position: idx }));
    update(next);
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.storagePath}
            className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-night/5 group"
          >
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="200px"
              className="object-cover"
              unoptimized
            />
            {photo.position === 0 ? (
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
                Couverture
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => handleRemove(photo)}
              aria-label="Retirer"
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/95 text-red-500 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-2xl border-2 border-dashed border-line bg-night/[0.02] flex flex-col items-center justify-center gap-2 text-night-muted hover:border-night/30 hover:bg-night/5 transition-colors",
              uploading && "opacity-60 cursor-wait",
            )}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="w-6 h-6" aria-hidden />
            )}
            <span className="text-[11px] font-semibold">
              {uploading ? "Téléversement..." : "Ajouter"}
            </span>
            <span className="text-[10px] text-muted">
              {photos.length}/{MAX_PHOTOS}
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        multiple
        onChange={handleFiles}
        className="sr-only"
      />

      <p className="mt-3 text-xs text-muted">
        JPG, PNG ou WebP — 8 Mo max par photo · La première photo sera la
        couverture
      </p>
    </div>
  );
}
