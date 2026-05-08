"use client";

import { Save, Sparkles } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import type { Profile } from "@/lib/database.types";
import {
  updateProHeader,
  type ProHeaderState,
} from "../pro-actions";

const INITIAL: ProHeaderState = { status: "idle" };

export function ProHeaderForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProHeaderState, FormData>(
    updateProHeader,
    INITIAL,
  );

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <Field>
        <FieldLabel htmlFor="headline">
          <Sparkles className="inline w-3.5 h-3.5 text-gold-deep mr-1 -mt-0.5" />
          Phrase d&apos;accroche
        </FieldLabel>
        <Input
          id="headline"
          name="headline"
          defaultValue={profile.headline ?? ""}
          maxLength={200}
          placeholder="Ex. Designer produit · Mobile Money · ex-Orange"
        />
        <FieldHint>
          Une ligne percutante qui te résume. Affichée sous ton nom partout.
        </FieldHint>
      </Field>

      <div className="space-y-3 pt-3 border-t border-line">
        <Switch
          name="open_to_work"
          label="🟢 Ouvert aux opportunités"
          description="Un badge vert apparaît sur ton profil. Les recruteurs te trouvent en priorité."
          defaultChecked={profile.open_to_work}
        />
        <Switch
          name="open_to_hiring"
          label="🔵 Je recrute"
          description="Pour les recruteurs / fondateurs. Badge bleu sur ton profil."
          defaultChecked={profile.open_to_hiring}
        />
        <Switch
          name="discrete_search"
          label="🥷 Mode recherche discrète"
          description="Tes vues de profil ne sont plus enregistrées chez les autres."
          defaultChecked={profile.discrete_search}
        />
      </div>

      <div className="flex justify-end pt-3 border-t border-line">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
