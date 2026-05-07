"use client";

import { Globe, ImagePlus, Lock, Loader2, Send, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import type { PostVisibility } from "@/lib/database.types";
import { createPost, type PostFormState } from "../actions";

const INITIAL: PostFormState = { status: "idle" };
const MAX_PHOTOS = 4;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

type Photo = { url: string; position: number; storagePath: string };

type PostComposerProps = {
  userId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

export function PostComposer({
  userId,
  authorName,
  authorAvatarUrl,
}: PostComposerProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    PostFormState,
    FormData
  >(createPost, INITIAL);

  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("friends");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setBody("");
      setPhotos([]);
      setVisibility("friends");
      toast.success("Post publié ✨");
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function autosize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
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
    const uploaded: Photo[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`Format invalide pour ${file.name}.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name} trop lourde.`);
        continue;
      }

      const ext = file.type.split("/")[1] ?? "jpg";
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("posts")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
        });
      if (error) {
        toast.error(`Échec : ${file.name}`);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(storagePath);
      uploaded.push({
        url: publicUrl,
        position: photos.length + uploaded.length,
        storagePath,
      });
    }

    if (uploaded.length > 0) setPhotos([...photos, ...uploaded]);
    setUploading(false);
  }

  async function removePhoto(photo: Photo) {
    const supabase = createClient();
    await supabase.storage.from("posts").remove([photo.storagePath]);
    setPhotos((prev) =>
      prev
        .filter((p) => p.storagePath !== photo.storagePath)
        .map((p, idx) => ({ ...p, position: idx })),
    );
  }

  const canSubmit = (body.trim().length > 0 || photos.length > 0) && !pending && !uploading;

  return (
    <form action={formAction} className="rounded-3xl bg-white border border-line shadow-soft overflow-hidden">
      <input type="hidden" name="visibility" value={visibility} />
      <input
        type="hidden"
        name="photos"
        value={JSON.stringify(
          photos.map((p) => ({ url: p.url, position: p.position })),
        )}
      />

      <div className="p-4 sm:p-5 flex gap-3">
        <Avatar src={authorAvatarUrl} fullName={authorName} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            name="body"
            value={body}
            onChange={(event) => {
              setBody(event.currentTarget.value);
              autosize();
            }}
            placeholder="Quoi de neuf ?"
            rows={2}
            maxLength={4000}
            className="w-full resize-none border-0 bg-transparent text-night text-base placeholder:text-muted focus:outline-none"
          />

          {photos.length > 0 ? (
            <div
              className={cn(
                "mt-3 grid gap-2",
                photos.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
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
                  <button
                    type="button"
                    onClick={() => removePhoto(photo)}
                    aria-label="Retirer"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/95 text-red-500 hover:bg-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-t border-line bg-night/[0.02]">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          multiple
          onChange={handleFiles}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-night/5 text-night-muted hover:bg-night/10 hover:text-night text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="w-4 h-4" aria-hidden />
          )}
          Photos
          {photos.length > 0 ? ` · ${photos.length}/${MAX_PHOTOS}` : ""}
        </button>

        <VisibilityPicker value={visibility} onChange={setVisibility} />

        <span className="ml-auto text-xs text-muted">{body.length}/4000</span>
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 h-9 rounded-full font-semibold text-sm transition",
            canSubmit
              ? "bg-night text-cream hover:bg-night-soft"
              : "bg-night/30 text-cream cursor-not-allowed",
          )}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Send className="w-4 h-4" aria-hidden />
          )}
          Publier
        </button>
      </div>
    </form>
  );
}

function VisibilityPicker({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (next: PostVisibility) => void;
}) {
  const options: { value: PostVisibility; label: string; icon: typeof Globe }[] =
    [
      { value: "friends", label: "Amis", icon: Users },
      { value: "public", label: "Public", icon: Globe },
      { value: "private", label: "Moi", icon: Lock },
    ];

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-night/5 border border-line">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold transition",
              active
                ? "bg-white text-night shadow-sm"
                : "text-night-muted hover:text-night",
            )}
          >
            <Icon className="w-3 h-3" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
