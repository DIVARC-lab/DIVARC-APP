"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  CURRENCY_LABELS,
  LOCALE_LABELS,
  THEME_LABELS,
  type Profile,
  type Theme,
} from "@/lib/database.types";
import { setThemeImmediate } from "@/components/ThemeProvider";
import { updatePreferences, type PreferencesFormState } from "./actions";

const INITIAL: PreferencesFormState = { status: "idle" };

export function PreferencesForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<
    PreferencesFormState,
    FormData
  >(updatePreferences, INITIAL);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-7">
      <section className="space-y-4">
        <header>
          <h3 className="font-display text-xl text-night">Région & langue</h3>
          <p className="text-sm text-muted mt-0.5">
            Adapte DIVARC à ton pays et ta devise.
          </p>
        </header>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="locale">Langue & région</FieldLabel>
            <Select id="locale" name="locale" defaultValue={profile.locale}>
              {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="currency">Devise</FieldLabel>
            <Select
              id="currency"
              name="currency"
              defaultValue={profile.currency}
            >
              {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h3 className="font-display text-xl text-night">Apparence</h3>
          <p className="text-sm text-muted mt-0.5">
            Choisis le thème de ton interface.
          </p>
        </header>
        <Field>
          <FieldLabel htmlFor="theme">Thème</FieldLabel>
          <Select
            id="theme"
            name="theme"
            defaultValue={profile.theme}
            onChange={(event) =>
              setThemeImmediate(event.currentTarget.value as Theme)
            }
          >
            {Object.entries(THEME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <FieldHint>
            Le changement est appliqué immédiatement. Sauvegarde pour le
            persister sur tous tes appareils.
          </FieldHint>
        </Field>
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="font-display text-xl text-night">Notifications</h3>
          <p className="text-sm text-muted mt-0.5">
            Reste informé sans être submergé.
          </p>
        </header>
        <Switch
          name="email_notifications"
          label="Emails importants"
          description="Confirmations, alertes de sécurité, nouveautés majeures."
          defaultChecked={profile.email_notifications}
        />
        <Switch
          name="push_notifications"
          label="Notifications push"
          description="Messages, mentions, réponses (à partir du sprint 3)."
          defaultChecked={profile.push_notifications}
        />
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="font-display text-xl text-night">Confidentialité</h3>
          <p className="text-sm text-muted mt-0.5">
            Toi seul décides ce qui est visible.
          </p>
        </header>
        <Switch
          name="discoverable"
          label="Apparaître dans la recherche"
          description="Les autres utilisateurs peuvent te trouver par pseudo ou nom."
          defaultChecked={profile.discoverable}
        />
        <Switch
          name="show_email"
          label="Afficher mon email"
          description="Visible uniquement par tes contacts directs."
          defaultChecked={profile.show_email}
        />
        <Switch
          name="show_location"
          label="Afficher ma ville"
          description="Sur ton profil public."
          defaultChecked={profile.show_location}
        />
      </section>

      <div className="flex justify-end pt-2 border-t border-line">
        <Button type="submit" loading={pending} size="lg">
          {!pending ? <Save className="w-4 h-4" aria-hidden /> : null}
          {pending ? "Enregistrement..." : "Enregistrer mes préférences"}
        </Button>
      </div>
    </form>
  );
}
