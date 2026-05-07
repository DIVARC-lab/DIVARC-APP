"use client";

import { Camera, ImageOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXTENSIONS: Record<(typeof ALLOWED_MIME)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type AvatarUploadProps = {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string | null;
};

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  fullName,
}: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [_, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      toast.error("Format invalide. Utilise JPG, PNG ou WebP.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image trop lourde. 4 Mo maximum.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    const promise = uploadAvatar(file, userId);

    toast.promise(promise, {
      loading: "Téléversement de la photo...",
      success: "Photo de profil mise à jour.",
      error: (err) =>
        err instanceof Error ? err.message : "Échec du téléversement.",
    });

    try {
      const finalUrl = await promise;
      setPreviewUrl(finalUrl);
      startTransition(() => router.refresh());
    } catch {
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    const promise = removeAvatar(userId);

    toast.promise(promise, {
      loading: "Suppression de la photo...",
      success: "Photo supprimée.",
      error: "Échec de la suppression.",
    });

    try {
      await promise;
      setPreviewUrl(null);
      startTransition(() => router.refresh());
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar src={previewUrl} fullName={fullName} size="xl" />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-4 h-4" aria-hidden />
            {previewUrl ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isUploading}
              onClick={handleRemove}
            >
              <ImageOff className="w-4 h-4" aria-hidden />
              Supprimer
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
        <p className="text-xs text-muted">JPG, PNG ou WebP — 4 Mo max</p>
      </div>
    </div>
  );
}

async function uploadAvatar(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext =
    ALLOWED_EXTENSIONS[file.type as (typeof ALLOWED_MIME)[number]] ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: cacheBustedUrl })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return cacheBustedUrl;
}

async function removeAvatar(userId: string): Promise<void> {
  const supabase = createClient();
  const { data: list } = await supabase.storage
    .from("avatars")
    .list(userId, { limit: 20 });

  if (list && list.length > 0) {
    await supabase.storage
      .from("avatars")
      .remove(list.map((entry) => `${userId}/${entry.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
