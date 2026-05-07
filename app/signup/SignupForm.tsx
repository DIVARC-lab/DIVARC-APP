"use client";

import { useActionState } from "react";
import { signUp } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Nom complet
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          placeholder="Pepemssie Divann"
          className="w-full px-4 py-3 rounded-xl border border-line bg-white text-fg placeholder:text-muted focus:outline-none focus:border-night focus:ring-2 focus:ring-night/10"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="toi@exemple.com"
          className="w-full px-4 py-3 rounded-xl border border-line bg-white text-fg placeholder:text-muted focus:outline-none focus:border-night focus:ring-2 focus:ring-night/10"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-night mb-1.5"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          className="w-full px-4 py-3 rounded-xl border border-line bg-white text-fg placeholder:text-muted focus:outline-none focus:border-night focus:ring-2 focus:ring-night/10"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-6 py-3 rounded-xl bg-night text-white font-semibold hover:bg-night-soft transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Création du compte..." : "Créer mon compte"}
      </button>

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
