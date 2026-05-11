"use client";

import { Eye, Lock, Users, Users2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/* ViewAsButton — bouton "Voir mon profil tel que vu par…".
 *
 * Disponible côté owner uniquement. Le mode `view_as` est passé en query
 * param et lu côté server pour appliquer un filtre visibility simulé.
 *
 * V1 modes : public / friends / friends_of_friends.
 * V2 : sélection user spécifique (search). */

type Mode = "public" | "friends" | "friends_of_friends";

type Props = {
  username: string;
  currentMode?: Mode;
};

const MODES: Array<{
  id: Mode;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  {
    id: "public",
    label: "Public",
    description: "Tel que vu par un visiteur non-connecté",
    icon: Lock,
  },
  {
    id: "friends",
    label: "Mes relations",
    description: "Vu par tes amis acceptés",
    icon: Users,
  },
  {
    id: "friends_of_friends",
    label: "Amis d'amis",
    description: "Vu par les contacts indirects",
    icon: Users2,
  },
];

export function ViewAsButton({ username, currentMode }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "h-10 px-3 rounded-full bg-white border border-line text-night text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-bg-soft transition-colors",
          currentMode && "ring-2 ring-gold/30 border-gold-deep",
        )}
      >
        <Eye className="w-3.5 h-3.5" aria-hidden />
        {currentMode
          ? `Vu comme · ${MODES.find((m) => m.id === currentMode)?.label}`
          : "Voir comme…"}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-line shadow-2xl z-30 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
              Voir mon profil comme…
            </p>
          </div>
          <ul>
            {MODES.map(({ id, label, description, icon: Icon }) => {
              const active = currentMode === id;
              return (
                <li key={id}>
                  <Link
                    href={`/u/${username}?view_as=${id}`}
                    role="menuitem"
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-bg-soft transition-colors",
                      active && "bg-gold/5",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="w-4 h-4 text-night-muted shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-night">
                        {label}
                      </p>
                      <p className="text-[11.5px] text-night-muted">
                        {description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
            {currentMode ? (
              <li className="border-t border-line">
                <Link
                  href={`/u/${username}`}
                  role="menuitem"
                  className="block px-4 py-3 text-center text-[12.5px] font-semibold text-gold-deep hover:bg-bg-soft"
                  onClick={() => setOpen(false)}
                >
                  Revenir à ma vue
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
