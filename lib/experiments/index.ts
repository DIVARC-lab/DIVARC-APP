/* Système A/B test minimaliste, server-only.
 *
 * Architecture :
 *  - Registry des expériences en code (source of truth, versionné Git)
 *  - Assignment déterministe via FNV-1a 32 bits sur (userId + salt)
 *    → même user = même variant tant que le salt ne change pas
 *  - Pas de table experiment_assignments (zéro coût DB, zéro lecture
 *    bloquante au render). L'assignment se reconstitue à la lecture.
 *  - Tracking : event recsys "experiment.exposure" loggué côté serveur
 *    au premier render qui consomme le variant. L'analyse côté SQL
 *    re-hash via une UDF stable (cf migration future si besoin) ou
 *    croise events.properties.variant.
 *
 * Garde-fous :
 *  - Force-override possible via env var EXPERIMENTS_FORCE_VARIANT pour
 *    debug ("feed-ranking-v2026=algorithmic"). Permet de tester un
 *    variant sans dépendre du hash.
 *  - Si l'expérience est désactivée (is_active === false), retourne le
 *    variant control par défaut.
 *  - userId vide → control (anonymes ne sont jamais traités).
 */

export type ExperimentId = "feed-ranking-v2026";

type ExperimentConfig = {
  id: ExperimentId;
  description: string;
  /** Variants exhaustifs. Le 1er est considéré comme "control". */
  variants: readonly string[];
  /** Pourcentage de trafic alloué à chaque variant (somme = 100). */
  traffic: Record<string, number>;
  /** Salt utilisé pour le hash. Changer = ré-assigner tout le monde. */
  salt: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
};

export const EXPERIMENTS: Record<ExperimentId, ExperimentConfig> = {
  "feed-ranking-v2026": {
    id: "feed-ranking-v2026",
    description:
      "A/B test du tab par défaut du feed : chronologique strict vs algorithmique. Mesure le lift d'engagement (likes/commentaires/dwell) du ranker recsys vs ordre temporel inverse.",
    variants: ["chronological", "algorithmic"],
    traffic: { chronological: 50, algorithmic: 50 },
    salt: "feed-ranking-v2026-50-50",
    is_active: true,
    starts_at: "2026-05-10T00:00:00Z",
    ends_at: "2026-08-10T00:00:00Z",
  },
};

/* FNV-1a 32 bits — déterministe, rapide, suffisamment équiréparti pour
 * un A/B test 50/50. Pas crypto-safe (et c'est volontaire : la
 * prédictibilité aide le debug). */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/* Sélectionne un variant en respectant les pourcentages configurés.
 * On mappe le hash sur [0, 100), puis on accumule les seuils. */
function pickVariant(
  config: ExperimentConfig,
  hash: number,
): string {
  const bucket = hash % 100;
  let cumulative = 0;
  for (const variant of config.variants) {
    cumulative += config.traffic[variant] ?? 0;
    if (bucket < cumulative) return variant;
  }
  return config.variants[0]!;
}

/* Lit un override via env var. Format :
 *   EXPERIMENTS_FORCE_VARIANT="feed-ranking-v2026=algorithmic"
 *
 * Plusieurs overrides séparés par virgule. Utile pour tests E2E /
 * preview Vercel sans toucher au code.
 */
function readForceOverride(experimentId: ExperimentId): string | null {
  const raw = process.env.EXPERIMENTS_FORCE_VARIANT;
  if (!raw) return null;
  for (const segment of raw.split(",")) {
    const [id, variant] = segment.trim().split("=");
    if (id === experimentId && variant) return variant;
  }
  return null;
}

export function getExperimentVariant(
  experimentId: ExperimentId,
  userId: string | null | undefined,
): string {
  const config = EXPERIMENTS[experimentId];
  if (!config) {
    console.warn(`[experiments] Unknown experiment: ${experimentId}`);
    return "control";
  }
  if (!config.is_active) return config.variants[0]!;

  /* Date check : avant starts_at ou après ends_at → control. */
  const now = Date.now();
  if (now < new Date(config.starts_at).getTime()) return config.variants[0]!;
  if (config.ends_at && now > new Date(config.ends_at).getTime())
    return config.variants[0]!;

  /* Override env (debug, E2E, preview Vercel). */
  const forced = readForceOverride(experimentId);
  if (forced && config.variants.includes(forced)) return forced;

  if (!userId) return config.variants[0]!;

  const hash = fnv1a32(`${userId}:${config.salt}`);
  return pickVariant(config, hash);
}

/* Helper pour exposer la définition d'une expérience à du code client
 * (admin dashboard, debug). Ne révèle pas le salt si on appelait depuis
 * un endpoint public. */
export function getExperimentSummary(experimentId: ExperimentId) {
  const config = EXPERIMENTS[experimentId];
  if (!config) return null;
  return {
    id: config.id,
    description: config.description,
    variants: config.variants,
    traffic: config.traffic,
    is_active: config.is_active,
    starts_at: config.starts_at,
    ends_at: config.ends_at,
  };
}
