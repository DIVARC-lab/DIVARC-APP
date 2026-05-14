/* DIVARC — Design System Structurel · Étape 12
 *
 * <LoadingState> — skeletons cohérents pour tous les loading.tsx.
 *
 * 5 variants :
 *   - cards    : skeleton de feed (avatar + 2 lignes texte + image).
 *   - list     : skeleton de liste verticale (avatar + 2 lignes).
 *   - profile  : skeleton page profil (cover + avatar + bio).
 *   - inline   : spinner + texte "Chargement…" (suspense inline).
 *   - page     : spinner centré plein écran (fallback générique).
 *
 * Réutilise <Skeleton /> existant (components/ui/Skeleton.tsx) pour la
 * grammaire DIVARC (gradient cream→bg-soft, pulse).
 *
 * Anti-pattern : ne pas écrire de skeleton ad-hoc dans chaque page.
 * Toujours passer par LoadingState. Si tu as besoin d'un variant
 * custom, propose-le ici.
 */

import { Card } from "./Card";
import { Row } from "../primitives/Row";
import { Stack } from "../primitives/Stack";
import { Skeleton } from "../ui/Skeleton";

type LoadingStateProps = {
  variant?: "cards" | "list" | "profile" | "inline" | "page";
  count?: number;
};

export function LoadingState({
  variant = "cards",
  count = 3,
}: LoadingStateProps) {
  if (variant === "cards") {
    return (
      <Stack gap="lg" aria-busy="true" aria-label="Chargement">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} variant="default">
            <Row align="center" gap="md">
              <Skeleton shape="circle" className="w-10 h-10" />
              <Stack gap="xs" className="flex-1">
                <Skeleton shape="text" className="w-32" />
                <Skeleton shape="text" className="w-20" />
              </Stack>
            </Row>
            <div className="mt-3">
              <Skeleton shape="text" className="w-full mb-2" />
              <Skeleton shape="text" className="w-4/5" />
            </div>
            <Skeleton className="w-full h-48 mt-3" />
          </Card>
        ))}
      </Stack>
    );
  }

  if (variant === "list") {
    return (
      <Stack gap="md" aria-busy="true" aria-label="Chargement">
        {Array.from({ length: count }).map((_, i) => (
          <Row key={i} align="center" gap="md">
            <Skeleton shape="circle" className="w-12 h-12" />
            <Stack gap="xs" className="flex-1">
              <Skeleton shape="text" className="w-36" />
              <Skeleton shape="text" className="w-24" />
            </Stack>
          </Row>
        ))}
      </Stack>
    );
  }

  if (variant === "profile") {
    return (
      <Stack gap="lg" aria-busy="true" aria-label="Chargement">
        <Skeleton className="w-full h-48" />
        <Row align="center" gap="lg">
          <Skeleton shape="circle" className="w-24 h-24" />
          <Stack gap="sm" className="flex-1">
            <Skeleton shape="text" className="w-48 h-6" />
            <Skeleton shape="text" className="w-32" />
            <Skeleton shape="text" className="w-64" />
          </Stack>
        </Row>
      </Stack>
    );
  }

  if (variant === "inline") {
    return (
      <Row align="center" gap="sm" aria-busy="true" aria-label="Chargement">
        <span className="inline-block w-4 h-4 border-2 border-gold-deep border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-night-muted">Chargement…</span>
      </Row>
    );
  }

  /* page */
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      aria-busy="true"
      aria-label="Chargement"
    >
      <span className="inline-block w-8 h-8 border-[3px] border-gold-deep border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
