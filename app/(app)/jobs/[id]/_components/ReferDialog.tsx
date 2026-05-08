"use client";

import { Search, Send, UserPlus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { referAFriend } from "../../referrals/actions";

type Friend = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  jobId: string;
  jobTitle: string;
  friends: Friend[];
  alreadyReferredIds: string[];
};

export function ReferDialog({
  jobId,
  jobTitle,
  friends,
  alreadyReferredIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const alreadySet = useMemo(() => new Set(alreadyReferredIds), [alreadyReferredIds]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter((f) => {
      const name = (f.full_name ?? "").toLowerCase();
      const handle = (f.username ?? "").toLowerCase();
      return name.includes(s) || handle.includes(s);
    });
  }, [friends, search]);

  function handleSubmit(formData: FormData) {
    if (!selectedId) {
      toast.error("Choisis un ami à coopter.");
      return;
    }
    formData.set("job_id", jobId);
    formData.set("referred_id", selectedId);

    startTransition(async () => {
      const result = await referAFriend(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cooptation envoyée ✨");
      setOpen(false);
      setSelectedId(null);
      setSearch("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-white border-2 border-gold/40 text-gold-deep text-sm font-semibold hover:bg-gold/10 transition-colors"
      >
        <UserPlus className="w-4 h-4" aria-hidden />
        Coopter un ami
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-night/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] overflow-hidden"
          >
            <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                  Cooptation
                </p>
                <h2 className="mt-1 font-display text-xl text-night">
                  Recommander quelqu&apos;un pour
                </h2>
                <p className="text-sm text-night-muted truncate max-w-xs">
                  « {jobTitle} »
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted hover:text-night"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            <form
              action={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              <Field>
                <FieldLabel htmlFor="refer_search">
                  Choisis un ami parmi ton réseau
                </FieldLabel>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    id="refer_search"
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    placeholder="Rechercher un ami..."
                    className="pl-9"
                  />
                </div>
                <FieldHint>
                  Tu ne peux coopter que tes amis (relations acceptées).
                </FieldHint>
              </Field>

              {friends.length === 0 ? (
                <div className="p-4 rounded-2xl bg-night/[0.03] border border-line text-sm text-muted text-center">
                  Tu n&apos;as encore aucun ami sur DIVARC. Va sur l&apos;onglet
                  Amis pour en ajouter.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted italic px-2 py-4 text-center">
                      Aucun ami ne correspond à « {search} ».
                    </p>
                  ) : (
                    filtered.map((friend) => {
                      const already = alreadySet.has(friend.user_id);
                      const selected = selectedId === friend.user_id;
                      const name =
                        friend.full_name ?? friend.username ?? "Ami";
                      return (
                        <button
                          key={friend.user_id}
                          type="button"
                          disabled={already}
                          onClick={() => setSelectedId(friend.user_id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors",
                            already
                              ? "opacity-60 cursor-not-allowed bg-night/[0.04]"
                              : selected
                                ? "bg-gold/15 border-2 border-gold/40"
                                : "hover:bg-night/[0.03] border-2 border-transparent",
                          )}
                        >
                          <Avatar
                            src={friend.avatar_url}
                            fullName={name}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-night text-sm truncate">
                              {name}
                            </p>
                            {friend.username ? (
                              <p className="text-xs text-muted truncate">
                                @{friend.username}
                              </p>
                            ) : null}
                          </div>
                          {already ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-night/10 text-night-muted">
                              Déjà coopté
                            </span>
                          ) : selected ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/30 text-gold-deep">
                              Sélectionné
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="refer_message">
                  Mot personnel (optionnel)
                </FieldLabel>
                <Textarea
                  id="refer_message"
                  name="message"
                  rows={3}
                  maxLength={1000}
                  placeholder="Ex. Je pense que ce poste est vraiment fait pour toi..."
                />
                <FieldHint>
                  Visible uniquement par la personne cooptée. 1000 caractères max.
                </FieldHint>
              </Field>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={pending}
                  disabled={!selectedId}
                >
                  <Send className="w-4 h-4" aria-hidden />
                  Envoyer la cooptation
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
