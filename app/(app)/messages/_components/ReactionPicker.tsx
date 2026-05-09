"use client";

import { SmilePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "😮", "😢", "🙏"] as const;

type ReactionPickerProps = {
  onPick: (emoji: string) => void;
  align?: "start" | "end";
};

export function ReactionPicker({ onPick, align = "start" }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handlePick(emoji: string) {
    onPick(emoji);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label="Réagir"
        className="w-11 h-11 rounded-full bg-white/95 border border-line text-night-muted hover:text-night hover:border-night/30 flex items-center justify-center shadow-soft"
      >
        <SmilePlus className="w-4 h-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-30 -top-12 flex items-center gap-0.5 p-1 rounded-full bg-white border border-line shadow-[0_18px_40px_-15px_rgba(10,31,68,0.45)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handlePick(emoji)}
              aria-label={`Réagir avec ${emoji}`}
              className="w-11 h-11 rounded-full text-lg hover:bg-night/5 transition-transform hover:scale-110 flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
