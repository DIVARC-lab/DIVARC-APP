"use client";

import { Camera, ImageOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

type AvatarStepProps = {
  userId: string;
  initialAvatarUrl: string | null;
  fullName: string | null;
  onAvatarChange: (url: string | null) => void;
};

export function AvatarStep({
  userId,
  initialAvatarUrl,
  fullName,
  onAvatarChange,
}: AvatarStepProps) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
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
      toast.error("Image trop lourde.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const cacheBusted = `${publicUrl}?v=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: cacheBusted })
      .eq("id", userId);

    setAvatar(cacheBusted);
    onAvatarChange(cacheBusted);
    setUploading(false);
    startTransition(() => router.refresh());
  }

  async function handleRemove() {
    const supabase = createClient();
    setUploading(true);
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    setAvatar(null);
    onAvatarChange(null);
    setUploading(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Ring gold solide 4px aligné sur le hero /u/[username] (Session 6). */}
      <div className="relative rounded-full ring-4 ring-[#f4b942] ring-offset-4 ring-offset-[#f3eddc]">
        <Avatar src={avatar} fullName={fullName} size="xl" />
        {uploading ? (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[#0a1f44]/40 flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 text-[#fff8e8] animate-spin" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#0a1f44] text-[#fff8e8] font-semibold text-sm hover:bg-[#142a55] transition-colors disabled:opacity-60"
        >
          <Camera className="w-4 h-4" aria-hidden />
          {avatar ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {avatar ? (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-semibold text-[#4b5b87] hover:text-[#0a1f44] hover:bg-[#0a1f44]/5 transition-colors disabled:opacity-60"
          >
            <ImageOff className="w-4 h-4" aria-hidden />
            Retirer
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={handleFile}
        className="sr-only"
      />

      <p className="text-xs text-[#6b7280] text-center">
        JPG, PNG ou WebP — 4 Mo max · facultatif mais recommandé
      </p>
    </div>
  );
}
