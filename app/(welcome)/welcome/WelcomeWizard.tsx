"use client";

import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  CURRENCY_LABELS,
  LOCALE_LABELS,
  type Currency,
  type Locale,
  type Profile,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { ArcMark } from "@/components/marketing/ArcMark";
import { AvatarStep } from "./_components/AvatarStep";
import { FriendsStep } from "./_components/FriendsStep";
import { StepProgress } from "./_components/StepProgress";
import {
  completeOnboarding,
  saveIdentityStep,
  savePreferencesStep,
  type IdentityStepState,
  type PreferencesStepState,
} from "./actions";

const STEPS = [
  { id: "intro", label: "Bienvenue" },
  { id: "identite", label: "Identité" },
  { id: "preferences", label: "Région" },
  { id: "amis", label: "Amis" },
] as const;

const IDENTITY_INITIAL: IdentityStepState = { status: "idle" };
const PREFERENCES_INITIAL: PreferencesStepState = { status: "idle" };

type WelcomeWizardProps = {
  profile: Profile;
  fullName: string;
  founderRank: number | null;
};

export function WelcomeWizard({
  profile,
  fullName,
  founderRank,
}: WelcomeWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  const [identityState, identityAction, identityPending] =
    useActionState<IdentityStepState, FormData>(
      saveIdentityStep,
      IDENTITY_INITIAL,
    );
  const [preferencesState, preferencesAction, preferencesPending] =
    useActionState<PreferencesStepState, FormData>(
      savePreferencesStep,
      PREFERENCES_INITIAL,
    );

  const [completing, startCompleting] = useTransition();

  useEffect(() => {
    if (identityState.status === "success") {
      setStepIndex(2);
    } else if (identityState.status === "error" && identityState.message) {
      toast.error(identityState.message);
    }
  }, [identityState]);

  useEffect(() => {
    if (preferencesState.status === "success") {
      setStepIndex(3);
    } else if (
      preferencesState.status === "error" &&
      preferencesState.message
    ) {
      toast.error(preferencesState.message);
    }
  }, [preferencesState]);

  function handleSkip() {
    startCompleting(async () => {
      await completeOnboarding();
      router.push("/dashboard");
    });
  }

  function handleFinish() {
    startCompleting(async () => {
      await completeOnboarding();
      toast.success("Bienvenue dans DIVARC ✨");
      router.push("/dashboard");
    });
  }

  const visibleStep = useMemo(() => STEPS[stepIndex] ?? STEPS[0]!, [stepIndex]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between gap-4 mb-10">
        <div className="flex-1">
          <StepProgress steps={STEPS} currentStep={stepIndex} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          loading={completing}
        >
          Passer
        </Button>
      </header>

      <section
        key={visibleStep.id}
        className="reveal-up rounded-3xl bg-white border border-line shadow-soft p-7 sm:p-10"
      >
        {visibleStep.id === "intro" ? (
          <Intro
            fullName={fullName}
            founderRank={founderRank}
            onNext={() => setStepIndex(1)}
          />
        ) : null}

        {visibleStep.id === "identite" ? (
          <Identity
            profile={profile}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            state={identityState}
            action={identityAction}
            pending={identityPending}
            onBack={() => setStepIndex(0)}
          />
        ) : null}

        {visibleStep.id === "preferences" ? (
          <Preferences
            profile={profile}
            state={preferencesState}
            action={preferencesAction}
            pending={preferencesPending}
            onBack={() => setStepIndex(1)}
          />
        ) : null}

        {visibleStep.id === "amis" ? (
          <FriendsScreen onFinish={handleFinish} completing={completing} />
        ) : null}
      </section>
    </div>
  );
}

function Intro({
  fullName,
  founderRank,
  onNext,
}: {
  fullName: string;
  founderRank: number | null;
  onNext: () => void;
}) {
  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-5">
        <ArcMark size={96} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-gold-deep">
        Bienvenue sur DIVARC
      </span>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
        Salut <em className="italic">{fullName.split(" ")[0]}</em>.
      </h1>
      <p className="mt-4 text-night-muted leading-relaxed max-w-md mx-auto">
        Tu fais partie des fondateurs de DIVARC
        {founderRank ? ` (rang #${founderRank})` : ""}. Quelques minutes pour
        configurer ton compte et tu pourras commencer à discuter, vendre,
        partager.
      </p>
      <div className="mt-8 flex justify-center">
        <Button onClick={onNext} size="lg">
          <Sparkles className="w-4 h-4" aria-hidden />
          C&apos;est parti
        </Button>
      </div>
    </div>
  );
}

function Identity({
  profile,
  avatarUrl,
  onAvatarChange,
  state,
  action,
  pending,
  onBack,
}: {
  profile: Profile;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  state: IdentityStepState;
  action: (formData: FormData) => void;
  pending: boolean;
  onBack: () => void;
}) {
  const fullName = profile.full_name ?? "";

  return (
    <div className="space-y-7">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-gold-deep">
          Étape 1 · Identité
        </span>
        <h2 className="mt-2 font-display text-3xl text-night text-balance leading-tight">
          Comment veux-tu apparaître ?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ton nom, ton pseudo, une photo et une mini-bio.
        </p>
      </div>

      <AvatarStep
        userId={profile.id}
        initialAvatarUrl={avatarUrl}
        fullName={fullName}
        onAvatarChange={onAvatarChange}
      />

      <form action={action} className="space-y-5" noValidate>
        <Field>
          <FieldLabel htmlFor="onboarding-fullName" required>
            Nom complet
          </FieldLabel>
          <Input
            id="onboarding-fullName"
            name="fullName"
            required
            minLength={2}
            maxLength={80}
            defaultValue={fullName}
            invalid={Boolean(state.fieldErrors?.fullName)}
          />
          <FieldError>{state.fieldErrors?.fullName}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-username" required>
            Pseudo
          </FieldLabel>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted pointer-events-none">
              @
            </span>
            <Input
              id="onboarding-username"
              name="username"
              required
              minLength={3}
              maxLength={20}
              defaultValue={profile.username ?? ""}
              autoCapitalize="off"
              spellCheck={false}
              className="pl-8"
              invalid={Boolean(state.fieldErrors?.username)}
            />
          </div>
          <FieldHint>
            3 à 20 caractères, lettres minuscules, chiffres et _ uniquement.
          </FieldHint>
          <FieldError>{state.fieldErrors?.username}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-location">Ville</FieldLabel>
          <Input
            id="onboarding-location"
            name="location"
            defaultValue={profile.location ?? ""}
            maxLength={80}
            placeholder="Paris, France"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-bio">Bio</FieldLabel>
          <Textarea
            id="onboarding-bio"
            name="bio"
            rows={3}
            maxLength={280}
            defaultValue={profile.bio ?? ""}
            placeholder="En 280 caractères : qui tu es, ce que tu fais."
          />
        </Field>

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Retour
          </Button>
          <Button type="submit" loading={pending} size="lg">
            {!pending ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
            Continuer
          </Button>
        </div>
      </form>
    </div>
  );
}

function Preferences({
  profile,
  state,
  action,
  pending,
  onBack,
}: {
  profile: Profile;
  state: PreferencesStepState;
  action: (formData: FormData) => void;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-gold-deep">
          Étape 2 · Région
        </span>
        <h2 className="mt-2 font-display text-3xl text-night text-balance leading-tight">
          Choisis ta région et ta devise.
        </h2>
        <p className="mt-1 text-sm text-muted">
          Tu pourras toujours changer dans tes préférences.
        </p>
      </div>

      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="theme" value={profile.theme} />
        <input
          type="hidden"
          name="email_notifications"
          value={profile.email_notifications ? "on" : "off"}
        />
        <input
          type="hidden"
          name="push_notifications"
          value={profile.push_notifications ? "on" : "off"}
        />
        <input
          type="hidden"
          name="discoverable"
          value={profile.discoverable ? "on" : "off"}
        />
        <input
          type="hidden"
          name="show_email"
          value={profile.show_email ? "on" : "off"}
        />
        <input
          type="hidden"
          name="show_location"
          value={profile.show_location ? "on" : "off"}
        />

        <Field>
          <FieldLabel htmlFor="onboarding-locale">Région</FieldLabel>
          <Select
            id="onboarding-locale"
            name="locale"
            defaultValue={profile.locale}
          >
            {Object.entries(LOCALE_LABELS).map(([value, label]) => (
              <option key={value} value={value as Locale}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-currency">Devise</FieldLabel>
          <Select
            id="onboarding-currency"
            name="currency"
            defaultValue={profile.currency}
          >
            {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value as Currency}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <p className="text-xs text-muted">
          DIVARC affichera les prix et les annonces dans la devise choisie par
          défaut. Tu pourras toujours en sélectionner d&apos;autres.
        </p>

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Retour
          </Button>
          <Button type="submit" loading={pending} size="lg">
            {!pending ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
            Continuer
          </Button>
        </div>
      </form>
    </div>
  );
}

function FriendsScreen({
  onFinish,
  completing,
}: {
  onFinish: () => void;
  completing: boolean;
}) {
  return (
    <div className="space-y-7">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-gold-deep">
          Étape 3 · Premiers amis
        </span>
        <h2 className="mt-2 font-display text-3xl text-night text-balance leading-tight">
          Trouve <em className="italic">tes proches</em>.
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cherche-les par nom ou pseudo. Sans amis, l&apos;app reste calme — tu
          pourras toujours en ajouter plus tard.
        </p>
      </div>

      <FriendsStep />

      <div className="flex items-center justify-end pt-2 gap-2">
        <Button
          type="button"
          onClick={onFinish}
          loading={completing}
          size="lg"
          className={cn(completing ? "" : "bg-night text-cream")}
        >
          {completing ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <PartyPopper className="w-4 h-4" aria-hidden />
          )}
          Terminer
        </Button>
      </div>
    </div>
  );
}
