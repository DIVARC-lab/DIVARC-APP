"use client";

import { useEffect, useRef, useState } from "react";

export type CurrentUser = {
  id: string;
  email: string | null;
};

export type CurrentProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type State =
  | { status: "loading"; user: null; profile: null }
  | { status: "anonymous"; user: null; profile: null }
  | { status: "ready"; user: CurrentUser; profile: CurrentProfile | null };

/* Hook client qui lit le user authentifié via /api/me.
 *
 * Cache module-level pour éviter de re-fetch à chaque mount d'un composant
 * qui en a besoin (le user ne change pas pendant une session). Invalidation
 * uniquement au refresh / logout / sign-in via window event "divarc:auth".
 *
 * Usage typique : composants client qui ont besoin du user mais ne peuvent
 * pas recevoir les données en props (modals globaux montés dans le layout). */
let cachedState: State | null = null;
let inflight: Promise<State> | null = null;
const subscribers = new Set<(s: State) => void>();

async function fetchMe(): Promise<State> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (response.status === 401) {
        const next: State = { status: "anonymous", user: null, profile: null };
        cachedState = next;
        return next;
      }
      const data = (await response.json()) as {
        user: CurrentUser | null;
        profile: CurrentProfile | null;
      };
      const next: State =
        data.user
          ? { status: "ready", user: data.user, profile: data.profile }
          : { status: "anonymous", user: null, profile: null };
      cachedState = next;
      return next;
    } catch {
      const next: State = { status: "anonymous", user: null, profile: null };
      cachedState = next;
      return next;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useCurrentUserProfile(): State {
  const [state, setState] = useState<State>(
    cachedState ?? { status: "loading", user: null, profile: null },
  );
  /* Évite les re-renders inutiles si state est déjà cohérent. */
  const lastRef = useRef<State>(state);

  useEffect(() => {
    function notify(next: State) {
      lastRef.current = next;
      setState(next);
    }
    subscribers.add(notify);

    /* Au mount : si on a déjà un cache hot, on le retourne. Sinon fetch. */
    if (cachedState && cachedState.status !== "loading") {
      notify(cachedState);
    } else {
      void fetchMe().then(notify);
    }

    function onAuthChange() {
      cachedState = null;
      void fetchMe().then((next) => {
        for (const sub of subscribers) sub(next);
      });
    }
    window.addEventListener("divarc:auth", onAuthChange);

    return () => {
      subscribers.delete(notify);
      window.removeEventListener("divarc:auth", onAuthChange);
    };
  }, []);

  return state;
}
