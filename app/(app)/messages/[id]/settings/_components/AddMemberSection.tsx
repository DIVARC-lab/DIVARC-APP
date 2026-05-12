"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { addMember } from "../../../group-actions";

type Friend = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type AddMemberSectionProps = {
  conversationId: string;
  isOwner: boolean;
  friends: Friend[];
  existingMemberIds: string[];
};

/* Section "Ajouter des membres" : modal de sélection d'amis non
 * encore membres. Owner only. */
export function AddMemberSection({
  conversationId,
  isOwner,
  friends,
  existingMemberIds,
}: AddMemberSectionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const existingSet = useMemo(
    () => new Set(existingMemberIds),
    [existingMemberIds],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends
      .filter((f) => !existingSet.has(f.id))
      .filter((f) => {
        if (q.length === 0) return true;
        const hay = `${f.full_name ?? ""} ${f.username ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [friends, existingSet, query]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleAdd(userId: string, name: string) {
    startTransition(async () => {
      const res = await addMember(conversationId, userId);
      if (res.ok) {
        toast.success(`${name} ajouté au groupe.`);
        /* On laisse la modal ouverte pour ajouter d'autres membres
           rapidement. */
      } else {
        toast.error(res.error ?? "Ajout impossible.");
      }
    });
  }

  if (!isOwner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-line text-night-muted hover:border-night/30 hover:text-night hover:bg-night/[0.02] transition-colors"
      >
        <span className="w-10 h-10 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center">
          <UserPlus className="w-4 h-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold">Ajouter des membres</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter des membres"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-bg border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] max-h-[85dvh] flex flex-col"
          >
            <div
              aria-hidden
              className="mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15 sm:hidden"
            />
            <header className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h2 className="text-sm font-bold text-night">
                Ajouter au groupe
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            <div className="px-4 pt-3">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  placeholder="Rechercher un ami…"
                  aria-label="Rechercher un ami"
                  className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-3 text-sm text-night placeholder:text-muted/70 focus:outline-none focus:border-night/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {candidates.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">
                  {query.length > 0
                    ? "Aucun ami trouvé."
                    : "Tu n'as pas d'amis à ajouter (ou tous sont déjà dans le groupe)."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {candidates.map((f) => {
                    const name = f.full_name ?? f.username ?? "Ami";
                    return (
                      <li
                        key={f.id}
                        className="flex items-center gap-3 p-2 rounded-2xl hover:bg-night/[0.02]"
                      >
                        <Avatar
                          src={f.avatar_url}
                          fullName={name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-night truncate">
                            {name}
                          </p>
                          {f.username ? (
                            <p className="text-xs text-muted truncate">
                              @{f.username}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(f.id, name)}
                          disabled={pending}
                          className="shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full bg-night text-cream text-[12px] font-bold hover:bg-night-soft disabled:opacity-50"
                        >
                          <UserPlus className="w-3 h-3" aria-hidden />
                          Ajouter
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
