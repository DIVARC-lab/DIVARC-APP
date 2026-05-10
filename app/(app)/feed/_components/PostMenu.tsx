"use client";

import {
  EyeOff,
  Flag,
  Link as LinkIcon,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ReportModal } from "@/components/moderation/ReportModal";
import { runAction } from "@/lib/utils/clientAction";
import { deletePost } from "../actions";

type PostMenuProps = {
  postId: string;
  isOwn: boolean;
  authorName?: string | null;
};

/* Brief audit Session 1 #13 — le menu 3-dots #8696B0 doit apparaître sur
   TOUS les posts (handoff BoldPostCard). Actions branchées selon ownership :
   - isOwn : Modifier (à venir), Supprimer
   - !isOwn : Copier le lien, Masquer cet auteur (stub), Signaler (stub) */
export function PostMenu({ postId, isOwn, authorName }: PostMenuProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer ce post ?",
      description: "Cette action est définitive et ne peut pas être annulée.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await runAction(() => deletePost(postId), {
        successMessage: "Post supprimé.",
        errorMessage: "Suppression impossible.",
      });
      if (result?.ok) router.refresh();
    });
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/feed/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible.");
    }
    setOpen(false);
  }

  function handleStub(label: string) {
    toast(`${label} — bientôt disponible.`);
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Options du post"
        className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-dim hover:text-night transition-colors"
      >
        <MoreHorizontal className="w-[18px] h-[18px]" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-10 right-0 min-w-52 z-20 rounded-2xl bg-white border border-line shadow-soft p-1.5"
        >
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-night-muted hover:bg-night/5 hover:text-night"
          >
            <LinkIcon className="w-4 h-4" aria-hidden />
            Copier le lien
          </button>
          {isOwn ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              Supprimer
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  handleStub(
                    authorName
                      ? `Masquer ${authorName}`
                      : "Masquer cet auteur",
                  )
                }
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-night-muted hover:bg-night/5 hover:text-night"
              >
                <EyeOff className="w-4 h-4" aria-hidden />
                {authorName ? `Masquer ${authorName}` : "Masquer cet auteur"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50"
              >
                <Flag className="w-4 h-4" aria-hidden />
                Signaler
              </button>
            </>
          )}
        </div>
      ) : null}
      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={postId}
        contextLabel={authorName ? `ce post de ${authorName}` : "ce post"}
      />
    </div>
  );
}
