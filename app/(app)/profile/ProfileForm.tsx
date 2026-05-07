"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import type { Profile } from "@/lib/database.types";
import { updateProfile, type ProfileFormState } from "./actions";
import { UsernameField } from "./UsernameField";

const INITIAL_STATE: ProfileFormState = { status: "idle" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateProfile, INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field>
        <FieldLabel htmlFor="fullName" required>
          Nom complet
        </FieldLabel>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={profile.full_name ?? ""}
          placeholder="Pepemssie Divann"
          required
          maxLength={80}
          invalid={Boolean(state.fieldErrors?.fullName)}
        />
        <FieldError>{state.fieldErrors?.fullName}</FieldError>
      </Field>

      <UsernameField
        initialValue={profile.username ?? ""}
        serverError={state.fieldErrors?.username}
      />

      <Field>
        <FieldLabel htmlFor="location">Ville · Pays</FieldLabel>
        <Input
          id="location"
          name="location"
          type="text"
          defaultValue={profile.location ?? ""}
          placeholder="Paris, France"
          maxLength={80}
          invalid={Boolean(state.fieldErrors?.location)}
        />
        <FieldError>{state.fieldErrors?.location}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="bio">Bio</FieldLabel>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={profile.bio ?? ""}
          placeholder="Parle un peu de toi..."
          invalid={Boolean(state.fieldErrors?.bio)}
        />
        <FieldHint>280 caractères maximum.</FieldHint>
        <FieldError>{state.fieldErrors?.bio}</FieldError>
      </Field>

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
