/* Étape 16 — Catalogue cadeaux côté client (synchro avec migration 0160).
 *
 * Mapping icon_name → composant lucide. On garde la DB comme source de
 * vérité pour les prix/labels, mais on doit mapper le nom de l'icône
 * vers le composant React (lucide n'accepte pas de string dynamique
 * tree-shake-friendly).
 */

import type { LucideIcon } from "lucide-react";
import {
  Castle,
  Crown,
  Flame,
  Flower,
  Heart,
  Rocket,
  Star,
} from "lucide-react";

export const GIFT_ICON_MAP: Record<string, LucideIcon> = {
  Flower,
  Heart,
  Star,
  Flame,
  Crown,
  Rocket,
  Castle,
};

export function iconForGift(name: string): LucideIcon {
  return GIFT_ICON_MAP[name] ?? Heart;
}
