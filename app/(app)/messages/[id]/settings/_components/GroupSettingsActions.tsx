"use client";

import { LogOut, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { leaveGroup, renameGroup } from "../../../group-actions";

type GroupSettingsActionsProps = {
  conversationId: string;
  initialName: string;
  isOwner: boolean;
};

export function GroupSettingsActions({
  conversationId,
  initialName,
  isOwner,
}: GroupSettingsActionsProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [renaming, startRename] = useTransition();
  const [leaving, startLeave] = useTransition();

  function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === initialName) return;
    startRename(async () => {
      const result = await renameGroup(conversationId, name);
      if (result.ok) {
        toast.success("Groupe renommé.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  function handleLeave() {
    if (!confirm("Quitter ce groupe ? Tu pourras y être réinvité plus tard.")) {
      return;
    }
    startLeave(async () => {
      await leaveGroup(conversationId);
    });
  }

  return (
    <>
      <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
        <header className="mb-5">
          <h2 className="font-display text-xl text-night">Identité</h2>
          <p className="text-sm text-muted">
            {isOwner
              ? "En tant que créateur, tu peux renommer le groupe."
              : "Seul le créateur peut renommer le groupe."}
          </p>
        </header>

        <form onSubmit={handleRename} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="group-name">Nom du groupe</FieldLabel>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              minLength={2}
              maxLength={80}
              disabled={!isOwner}
            />
            <FieldHint>2 à 80 caractères.</FieldHint>
          </Field>
          {isOwner ? (
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={renaming}
                disabled={name.trim() === initialName || name.trim().length < 2}
                size="sm"
              >
                {!renaming ? <Save className="w-4 h-4" aria-hidden /> : null}
                Enregistrer
              </Button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="rounded-3xl bg-red-50/50 border border-red-200 p-6 sm:p-7">
        <header className="mb-3">
          <h2 className="font-display text-xl text-red-900">Zone sensible</h2>
          <p className="text-sm text-red-900/70">
            Quitter le groupe te retire immédiatement.
          </p>
        </header>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleLeave}
          loading={leaving}
        >
          {!leaving ? <LogOut className="w-4 h-4" aria-hidden /> : null}
          Quitter le groupe
        </Button>
      </section>
    </>
  );
}
