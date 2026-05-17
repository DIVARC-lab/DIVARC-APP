import { signInWithProvider } from "@/app/(auth)/oauth-actions";

type Props = {
  /** Chemin de redirection après login OAuth. Default = /dashboard. */
  next?: string;
  /** Texte affiché ("Continuer avec" pour signup, "Se connecter avec" pour login). */
  prefix?: string;
};

const PROVIDERS = [
  {
    id: "google" as const,
    label: "Google",
    icon: GoogleIcon,
  },
  {
    id: "apple" as const,
    label: "Apple",
    icon: AppleIcon,
  },
  {
    id: "facebook" as const,
    label: "Facebook",
    icon: FacebookIcon,
  },
];

export function SocialAuthButtons({ next = "/dashboard", prefix = "Continuer avec" }: Props) {
  return (
    <div className="space-y-2.5">
      {PROVIDERS.map((p) => (
        <form key={p.id} action={signInWithProvider}>
          <input type="hidden" name="provider" value={p.id} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="w-full h-12 inline-flex items-center justify-center gap-3 rounded-full border border-night/15 bg-white text-night text-sm font-semibold hover:border-night/40 hover:bg-night/[0.03] active:bg-night/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <p.icon className="w-5 h-5" />
            <span>
              {prefix} {p.label}
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3.1l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.2 7.9 3.1l5.7-5.7A20 20 0 0 0 24 4a20 20 0 0 0-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.3 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.2 5.2C41 35.6 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M16.4 1.7c0 1.3-.5 2.6-1.4 3.5-.9 1-2.3 1.7-3.5 1.6-.2-1.3.5-2.6 1.4-3.5.9-1 2.4-1.6 3.5-1.6Zm4.2 16.4c-.6 1.4-1 2-1.8 3.3-1.1 1.7-2.6 3.9-4.5 3.9-1.7 0-2.1-1.1-4.4-1.1-2.3 0-2.8 1.1-4.4 1.1-1.9 0-3.4-2-4.5-3.7-3-4.7-3.3-10.3-1.5-13.3 1.3-2.1 3.4-3.4 5.4-3.4 2 0 3.3 1.1 5 1.1 1.6 0 2.6-1.1 4.9-1.1 1.8 0 3.7 1 5 2.7-4.4 2.4-3.7 8.6.8 10.5Z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3v-2.6c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"
      />
      <path
        fill="#fff"
        d="M16.7 15.5 17.2 12h-3.3v-2.3c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.7 0-4.5 1.7-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.8 0v-8.4h2.8Z"
      />
    </svg>
  );
}
