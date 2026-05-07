"use client";

import { Camera, ImageOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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
      <div className="rounded-full ring-4 ring-bg p-1 bg-gradient-to-br from-gold via-gold-soft to-gold-deep">
        <div className="rounded-full bg-bg">
          <Avatar src={avatar} fullName={fullName} size="xl" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          type="button"
          variant="primary"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-4 h-4" aria-hidden />
          {avatar ? "Changer la photo" : "Ajouter une photo"}
        </Button>
        {avatar ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={uploading}
            onClick={handleRemove}
          >
            <ImageOff className="w-4 h-4" aria-hidden />
            Retirer
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={handleFile}
        className="sr-only"
      />

      <p className="text-xs text-muted text-center">
        JPG, PNG ou WebP — 4 Mo max · facultatif mais recommandé
      </p>
    </div>
  );
}
