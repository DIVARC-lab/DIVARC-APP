"use client";

import { useEffect, useState } from "react";

/* Étape 15 du chantier Feed FB-style — badge "Nouveau".
 *
 * Stocke en localStorage le timestamp de la DERNIÈRE fois où l'user a
 * quitté le feed. Au mount suivant, on lit cette valeur AVANT de la
 * mettre à jour → les posts plus récents que ce timestamp sont
 * considérés comme "nouveaux" pour la session courante.
 *
 * Update strategy :
 *  - Au unmount du composant (cleanup useEffect)
 *  - Au visibilitychange "hidden" (PWA fermée, tab switch)
 *
 * Ne pas update au mount (sinon on perd la fenêtre "depuis la dernière
 * visite" dès la première render).
 */

const STORAGE_KEY = "divarc:feed:last-visit";

export function useLastFeedVisit(): number | null {
  const [lastVisit, setLastVisit] = useState<number | null>(null);

  useEffect(() => {
    /* Lit la valeur précédente — c'est ELLE qu'on retourne pour
       calculer "nouveau" tant que l'user est sur la page. */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      setLastVisit(Number.isFinite(parsed) ? parsed : null);
    } catch {
      setLastVisit(null);
    }

    function saveNow() {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* Quota / private mode — ignore. */
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") saveNow();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      saveNow();
    };
  }, []);

  return lastVisit;
}
