"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
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
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Logo } from "@/components/Logo";
import { AvatarStep } from "./_components/AvatarStep";
import { FirstPostStep } from "./_components/FirstPostStep";
import { FriendsStep } from "./_components/FriendsStep";
import { InterestsStep } from "./_components/InterestsStep";
import { StepProgress } from "./_components/StepProgress";
import {
  completeOnboarding,
  saveIdentityStep,
  saveInterestsStep,
  savePreferencesStep,
  type IdentityStepState,
  type InterestsStepState,
  type PreferencesStepState,
} from "./actions";

/* Brief Session 7 — refonte Bold du wizard onboarding.
   - 1 intro full-bleed navy + 5 vraies étapes (handoff "5 étapes")
   - Plus de shadow-card central : chaque étape vit en pleine largeur sur
     fond cream → bg, ArcDeco gold visible en filigrane
   - StepProgress segmented bar gold (composant refait)
   - CTAs primaires en pill gold h-14 (cohérent feed composer Publier)
   - Container max-w-[640px] mobile-first, généreux desktop */
const STEPS = [
  { id: "intro", label: "Bienvenue" },
  { id: "identite", label: "Identité" },
  { id: "interets", label: "Intérêts" },
  { id: "preferences", label: "Région" },
  { id: "amis", label: "Amis" },
  { id: "premier-post", label: "Premier post" },
] as const;

const IDENTITY_INITIAL: IdentityStepState = { status: "idle" };
const PREFERENCES_INITIAL: PreferencesStepState = { status: "idle" };
const INTERESTS_INITIAL: InterestsStepState = { status: "idle" };

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
  const [interestsState, interestsAction, interestsPending] =
    useActionState<InterestsStepState, FormData>(
      saveInterestsStep,
      INTERESTS_INITIAL,
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
    if (interestsState.status === "success") {
      setStepIndex(3);
    } else if (
      interestsState.status === "error" &&
      interestsState.message
    ) {
      toast.error(interestsState.message);
    }
  }, [interestsState]);

  useEffect(() => {
    if (preferencesState.status === "success") {
      setStepIndex(4);
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
  const isIntro = visibleStep.id === "intro";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-cream via-bg-deep to-bg">
      {/* ArcDeco gold filigrane — caché sur intro (l'intro a son propre hero navy). */}
      {!isIntro ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 opacity-50"
          >
            <ArcDeco size={420} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 bottom-0 opacity-30"
          >
            <ArcDeco size={320} tone="gold" opacity={1} stroke={1} />
          </div>
        </>
      ) : null}

      <div className="relative mx-auto w-full max-w-[640px] px-5 sm:px-6 py-8 sm:py-10">
        {/* Header sticky : progression + skip — caché sur l'intro. */}
        {!isIntro ? (
          <header className="sticky top-2 z-10 flex items-center gap-4 mb-8 rounded-2xl bg-white/80 backdrop-blur-md border border-line px-4 py-3 shadow-soft">
            <div className="flex-1 min-w-0">
              <StepProgress steps={STEPS} currentStep={stepIndex} />
            </div>
            <button
              type="button"
              onClick={handleSkip}
              disabled={completing}
              className="shrink-0 text-xs font-bold uppercase tracking-widest text-night-muted hover:text-night transition-colors disabled:opacity-50"
            >
              {completing ? "..." : "Passer"}
            </button>
          </header>
        ) : null}

        <section key={visibleStep.id} className="reveal-up">
          {visibleStep.id === "intro" ? (
            <Intro
              fullName={fullName}
              founderRank={founderRank}
              onNext={() => setStepIndex(1)}
              onSkip={handleSkip}
              skipping={completing}
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

          {visibleStep.id === "interets" ? (
            <InterestsStep
              initial={profile.interests ?? []}
              state={interestsState}
              action={interestsAction}
              pending={interestsPending}
              onBack={() => setStepIndex(1)}
            />
          ) : null}

          {visibleStep.id === "preferences" ? (
            <Preferences
              profile={profile}
              state={preferencesState}
              action={preferencesAction}
              pending={preferencesPending}
              onBack={() => setStepIndex(2)}
            />
          ) : null}

          {visibleStep.id === "amis" ? (
            <FriendsScreen
              onNext={() => setStepIndex(5)}
              onBack={() => setStepIndex(3)}
            />
          ) : null}

          {visibleStep.id === "premier-post" ? (
            <FirstPostStep
              fullName={fullName}
              avatarUrl={avatarUrl}
              location={profile.location}
              onBack={() => setStepIndex(4)}
              onComplete={handleFinish}
              completing={completing}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Intro({
  fullName,
  founderRank,
  onNext,
  onSkip,
  skipping,
}: {
  fullName: string;
  founderRank: number | null;
  onNext: () => void;
  onSkip: () => void;
  skipping: boolean;
}) {
  const FEATURES = ["Cercles", "Jobs", "Marketplace", "Stories", "Wallet"];
  return (
    <div className="relative -mx-5 sm:mx-0 sm:rounded-[36px] overflow-hidden bg-night text-cream px-7 sm:px-12 py-12 sm:py-16 min-h-[calc(100vh-80px)] sm:min-h-0 flex flex-col justify-center">
      <div
        aria-hidden
        className="absolute -right-24 -top-28 pointer-events-none"
      >
        <ArcDeco size={420} tone="gold" opacity={0.55} stroke={1.5} />
      </div>
      <div
        aria-hidden
        className="absolute -left-28 -bottom-32 pointer-events-none"
      >
        <ArcDeco size={340} tone="gold" opacity={0.2} stroke={1} />
      </div>

      <div className="relative text-center">
        <div className="relative w-20 h-20 mx-auto mb-7">
          <Logo size={80} />
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-gold">
          · Bienvenue
        </span>
        <h1 className="mt-4 font-display italic text-[44px] sm:text-[56px] text-cream text-balance leading-[1.05] tracking-[-0.02em]">
          Le réseau de ton{" "}
          <span className="text-gold">quartier</span>.
        </h1>
        <p className="mt-5 text-cream/75 leading-relaxed max-w-md mx-auto text-[14.5px]">
          Voisins, jobs locaux, bons plans, entraide. Pas de pub, pas
          d&apos;algo opaque.
          {founderRank ? (
            <>
              <br />
              <span className="text-gold font-semibold">
                Tu es fondateur · #{founderRank}
              </span>
            </>
          ) : null}
        </p>

        <ul
          aria-label="Fonctionnalités"
          className="mt-7 flex flex-wrap items-center justify-center gap-2"
        >
          {FEATURES.map((label, i) => (
            <li
              key={label}
              className={
                i === 1
                  ? "px-3.5 h-9 inline-flex items-center rounded-full bg-gold/20 text-gold text-xs font-extrabold border border-gold/40"
                  : "px-3.5 h-9 inline-flex items-center rounded-full bg-cream/[0.06] text-cream/80 text-xs font-semibold border border-cream/15"
              }
            >
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 h-14 w-full sm:w-auto sm:px-10 rounded-full bg-gold text-night font-extrabold text-[15px] hover:bg-gold-soft transition-colors shadow-[0_16px_36px_-10px_rgba(244,185,66,0.5)]"
          >
            Commencer
            <ArrowRight className="w-4 h-4" aria-hidden strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={skipping}
            className="text-xs font-bold uppercase tracking-widest text-cream/50 hover:text-cream/80 transition-colors disabled:opacity-50"
          >
            {skipping ? "..." : "Passer pour l'instant"}
          </button>
        </div>
        <p className="mt-5 text-xs text-cream/55">
          Salut{" "}
          <em className="italic font-display text-cream">
            {fullName.split(" ")[0]}
          </em>{" "}
          · 2 min suffisent
        </p>
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
    <div className="space-y-8">
      <header>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Identité
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Comment veux-tu{" "}
          <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
            apparaître
          </em>{" "}
          ?
        </h2>
        <p className="mt-3 text-[15px] text-night-muted leading-relaxed max-w-md">
          Ton nom, ton pseudo, une photo et une mini-bio.
        </p>
      </header>

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

        <StepActions onBack={onBack} pending={pending} />
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
    <div className="space-y-8">
      <header>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Région
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Tu habites{" "}
          <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
            où
          </em>{" "}
          ?
        </h2>
        <p className="mt-3 text-[15px] text-night-muted leading-relaxed max-w-md">
          Pour t&apos;afficher les bons cercles, événements et offres locales.
          Tu pourras toujours changer dans tes préférences.
        </p>
      </header>

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

        <StepActions onBack={onBack} pending={pending} />
      </form>
    </div>
  );
}

function FriendsScreen({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-8">
      <header>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Tes premières connexions
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Voici qui est{" "}
          <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
            déjà
          </em>{" "}
          chez toi
        </h2>
        <p className="mt-3 text-[15px] text-night-muted leading-relaxed max-w-md">
          Cherche-les par nom ou pseudo. Sans amis, l&apos;app reste calme — tu
          pourras toujours en ajouter plus tard.
        </p>
      </header>

      <FriendsStep />

      <StepActions onBack={onBack} onNext={onNext} />
    </div>
  );
}

/* CTA bar Bold : Retour ghost à gauche, Continuer pill gold h-14 à droite.
   Sur mobile : empilé verticalement (Continuer en haut, full-width). */
function StepActions({
  onBack,
  onNext,
  pending,
}: {
  onBack: () => void;
  onNext?: () => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-night-muted hover:text-night hover:bg-night/5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour
      </button>
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-gold text-night font-extrabold text-[15px] hover:bg-gold-soft transition-colors shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)]"
        >
          Continuer
          <ArrowRight className="w-4 h-4" aria-hidden />
        </button>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-gold text-night font-extrabold text-[15px] hover:bg-gold-soft transition-colors shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)] disabled:opacity-60"
        >
          {pending ? "..." : "Continuer"}
          {!pending ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
        </button>
      )}
    </div>
  );
}
