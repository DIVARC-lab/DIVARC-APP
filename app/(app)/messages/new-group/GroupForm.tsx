"use client";

import { Check, Loader2, Search, Send, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { createGroup } from "../group-actions";

type Friend = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type GroupFormProps = {
  friends: Friend[];
};

export function GroupForm({ friends }: GroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((friend) => {
      const haystack = [friend.full_name, friend.username]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [friends, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      toast.error("Choisis au moins un ami.");
      return;
    }
    startTransition(async () => {
      const result = await createGroup(name, Array.from(selected));
      if (result.ok) {
        toast.success("Groupe créé.");
        router.push(`/messages/${result.conversationId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Field>
        <FieldLabel htmlFor="group-name" required>
          Nom du groupe
        </FieldLabel>
        <Input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          maxLength={80}
          minLength={2}
          required
          placeholder="Famille 🏡"
        />
        <FieldHint>Tu pourras le changer plus tard.</FieldHint>
      </Field>

      <div>
        <FieldLabel as="span">Membres</FieldLabel>
        <p className="mt-0.5 text-sm text-muted">
          {selected.size} sélectionné{selected.size > 1 ? "s" : ""} ·{" "}
          {friends.length} ami{friends.length > 1 ? "s" : ""} disponible
          {friends.length > 1 ? "s" : ""}
        </p>

        <div className="relative mt-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Rechercher un ami..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            className="w-full h-10 rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />
        </div>

        {friends.length === 0 ? (
          <p className="mt-6 text-sm text-muted text-center">
            Tu n&apos;as pas encore d&apos;amis. Pour créer un groupe, ajoute
            d&apos;abord des amis.
          </p>
        ) : (
          <ul className="mt-4 max-h-[420px] overflow-y-auto space-y-1 -mx-1 px-1 rounded-2xl border border-line bg-white">
            {filtered.map((friend) => {
              const isSelected = selected.has(friend.id);
              const displayName =
                friend.full_name ?? friend.username ?? "Utilisateur";
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    onClick={() => toggle(friend.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors rounded-2xl",
                      isSelected
                        ? "bg-night/[0.04]"
                        : "hover:bg-night/[0.02]",
                    )}
                  >
                    <Avatar
                      src={friend.avatar_url}
                      fullName={displayName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-night truncate">
                        {displayName}
                      </p>
                      {friend.username ? (
                        <p className="text-xs text-muted truncate">
                          @{friend.username}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-night border-night text-cream"
                          : "border-line",
                      )}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5" aria-hidden />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Aucun ami pour « {search} ».
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="submit"
          loading={pending}
          disabled={selected.size === 0 || name.trim().length < 2}
          size="lg"
        >
          {!pending ? <Send className="w-4 h-4" aria-hidden /> : null}
          Créer le groupe ({selected.size + 1})
        </Button>
      </div>
    </form>
  );
}
