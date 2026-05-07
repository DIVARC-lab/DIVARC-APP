"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePost } from "../actions";

type PostMenuProps = {
  postId: string;
};

export function PostMenu({ postId }: PostMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  function handleDelete() {
    if (!confirm("Supprimer ce post définitivement ?")) return;
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.ok) {
        toast.success("Post supprimé.");
        router.refresh();
      } else {
        toast.error("Suppression impossible.");
      }
    });
  }

  return (
    <div ref={menuRef} className="relative">
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
        className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-10 right-0 min-w-44 z-20 rounded-2xl bg-white border border-line shadow-soft p-1.5"
        >
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            Supprimer
          </button>
        </div>
      ) : null}
    </div>
  );
}
