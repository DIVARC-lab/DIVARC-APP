"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { toggleSaveJob } from "@/app/(app)/jobs/actions";

type SaveJobButtonProps = {
  jobId: string;
  initialSaved: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function SaveJobButton({
  jobId,
  initialSaved,
  size = "md",
  className,
}: SaveJobButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleSaveJob(jobId);
      if (!result.ok) {
        setSaved(!next);
        toast.error("Action impossible.");
        return;
      }
      setSaved(result.saved);
      router.refresh();
    });
  }

  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-4.5 h-4.5";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Retirer des sauvegardés" : "Sauvegarder"}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm border transition-all",
        saved
          ? "border-night text-night"
          : "border-line text-night-muted hover:border-night/40 hover:text-night",
        dim,
        pending && "opacity-70",
        className,
      )}
    >
      <Bookmark
        className={cn(iconSize, saved ? "fill-current" : "fill-transparent")}
        aria-hidden
      />
    </button>
  );
}
