"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft } from "@/app/(app)/profile/draft-actions";

/* useProfileDraft — auto-save brouillon d'édition profil V2.
 *
 * - Debounce 1.2s sur les changements (évite spam DB)
 * - Status local pour afficher "Sauvegarde…" / "Sauvegardé"
 * - Sync multi-device via RPC upsert_draft_profile (last-write-wins V1)
 *
 * Le composant appelant fournit le payload courant (qui peut contenir
 * tout : identity, sections, facets, etc.) et update() à chaque change.
 *
 * V2 : optimistic locking via version (déjà returnée par saveDraft) à
 * comparer avec un useRef pour détecter conflit multi-onglet. */

export type DraftStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;

export function useProfileDraft<
  T extends Record<string, unknown>,
>(initialPayload: T) {
  const [payload, setPayload] = useState<T>(initialPayload);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const versionRef = useRef<number>(1);
  const lastSavedRef = useRef<string>(JSON.stringify(initialPayload));

  const flush = useCallback(
    async (currentSection?: string) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSavedRef.current) {
        return;
      }
      setStatus("saving");
      const res = await saveDraft(payload, currentSection);
      if (res.ok) {
        versionRef.current = res.version;
        lastSavedRef.current = snapshot;
        setSavedAt(new Date());
        setStatus("saved");
      } else {
        setStatus("error");
      }
    },
    [payload],
  );

  /* Schedule auto-save quand payload change. */
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSavedRef.current) return;
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [payload, flush]);

  /* Helper merge partial pour update fluide depuis l'UI. */
  const update = useCallback((patch: Partial<T>) => {
    setPayload((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    payload,
    update,
    flush,
    status,
    savedAt,
    version: versionRef.current,
  };
}
