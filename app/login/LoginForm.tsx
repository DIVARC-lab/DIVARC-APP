"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="space-y-4">
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
          autoComplete="current-password"
          placeholder="••••••••"
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
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
