"use client";

import {
  ArrowRight,
  AtSign,
  Cake,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  UserCircle2,
} from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { signUp } from "./actions";

const MONTHS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - 13 - i);

const GENDERS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "non_binary", label: "Non-binaire" },
  { value: "other", label: "Autre" },
  { value: "prefer_not_to_say", label: "Préfère ne pas dire" },
];

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Nom complet */}
      <Field>
        <FieldLabel htmlFor="fullName" required>
          Nom complet
        </FieldLabel>
        <div className="relative">
          <User
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            placeholder="Pepemssie Divann"
            maxLength={80}
            className="pl-11"
            invalid={hasError}
          />
        </div>
      </Field>

      {/* Username */}
      <Field>
        <FieldLabel htmlFor="username" required>
          Nom d&apos;utilisateur
        </FieldLabel>
        <div className="relative">
          <AtSign
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="username"
            name="username"
            type="text"
            required
            pattern="^[a-z0-9_]{3,30}$"
            autoComplete="username"
            placeholder="pepe_divarc"
            maxLength={30}
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldHint>3 à 30 caractères, minuscules, chiffres et underscores.</FieldHint>
      </Field>

      {/* Email */}
      <Field>
        <FieldLabel htmlFor="email" required>
          Email
        </FieldLabel>
        <div className="relative">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="toi@exemple.com"
            className="pl-11"
            invalid={hasError}
          />
        </div>
      </Field>

      {/* Numéro de téléphone */}
      <Field>
        <FieldLabel htmlFor="phoneNumber">Numéro de téléphone</FieldLabel>
        <div className="relative">
          <Phone
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            placeholder="+33 6 12 34 56 78"
            maxLength={20}
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldHint>Optionnel. Inclus l&apos;indicatif pays.</FieldHint>
      </Field>

      {/* Date de naissance */}
      <Field>
        <FieldLabel htmlFor="birthDay" required>
          Date de naissance
        </FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <Cake
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
              aria-hidden
            />
            <select
              id="birthDay"
              name="birthDay"
              required
              defaultValue=""
              className="w-full h-10 pl-8 pr-3 rounded-xl border border-line bg-white text-[14px] focus:outline-none focus:border-night/30"
            >
              <option value="" disabled>
                Jour
              </option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <select
            name="birthMonth"
            required
            defaultValue=""
            className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[14px] focus:outline-none focus:border-night/30"
          >
            <option value="" disabled>
              Mois
            </option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            name="birthYear"
            required
            defaultValue=""
            className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[14px] focus:outline-none focus:border-night/30"
          >
            <option value="" disabled>
              Année
            </option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <FieldHint>
          Tu dois avoir au moins 13 ans. Cette information aide à
          personnaliser ton expérience et ne sera pas publique par défaut.
        </FieldHint>
      </Field>

      {/* Genre */}
      <Field>
        <FieldLabel htmlFor="gender">Genre</FieldLabel>
        <div className="relative">
          <UserCircle2
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
            aria-hidden
          />
          <select
            id="gender"
            name="gender"
            defaultValue=""
            className="w-full h-10 pl-8 pr-3 rounded-xl border border-line bg-white text-[14px] focus:outline-none focus:border-night/30"
          >
            <option value="">— Préférer ne pas dire —</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <FieldHint>Optionnel.</FieldHint>
      </Field>

      {/* Ville */}
      <Field>
        <FieldLabel htmlFor="locationCity">Ville</FieldLabel>
        <div className="relative">
          <MapPin
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="locationCity"
            name="locationCity"
            type="text"
            autoComplete="address-level2"
            placeholder="Paris, Dakar, Montréal..."
            maxLength={80}
            className="pl-11"
          />
        </div>
        <FieldHint>Optionnel. Permet de te connecter à des cercles locaux.</FieldHint>
      </Field>

      {/* Mot de passe */}
      <Field>
        <FieldLabel htmlFor="password" required>
          Mot de passe
        </FieldLabel>
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            className="pl-11"
            invalid={hasError}
          />
        </div>
        <FieldHint>Au moins 8 caractères. Mélange lettres et chiffres.</FieldHint>
        <FieldError>{state?.error}</FieldError>
      </Field>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        {pending ? (
          "Création du compte..."
        ) : (
          <>
            <AtSign className="w-4 h-4" aria-hidden />
            Créer mon compte
            <ArrowRight className="w-4 h-4" aria-hidden />
          </>
        )}
      </Button>

      <p className="text-xs text-muted text-center pt-2">
        En créant un compte, tu acceptes nos{" "}
        <a href="#" className="underline hover:text-night">
          conditions d&apos;utilisation
        </a>{" "}
        et notre{" "}
        <a href="#" className="underline hover:text-night">
          politique de confidentialité
        </a>
        .
      </p>
    </form>
  );
}
