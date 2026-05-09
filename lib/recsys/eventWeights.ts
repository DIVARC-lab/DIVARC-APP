/* Poids des events pour le calcul d'affinité.
 *
 * Source : brief V1, calibré sur observations Pinterest/LinkedIn.
 * Reports / hide / see_less = négatifs forts, exclusion de topics.
 * Like / comment / save / share = positifs, valeurs croissantes.
 * Impressions / dwell = signaux faibles mais cumulatifs.
 *
 * Le tagging dwell_3s+ / dwell_10s+ / video.completion_25 etc. n'est
 * pas natif dans event_type — la conversion se fait dans
 * `mapDwellEventToWeight` selon les properties.dwell_ms de l'event. */

export const EVENT_WEIGHTS: Record<string, number> = {
  // Négatifs (exclusion)
  "post.report": -50,
  "post.hide": -10,
  "post.see_less": -5,
  "post.unlike": -2,
  "user.unfollow": -3,
  "circle.leave": -3,

  // Faibles
  "post.impression": 0.1,

  // Engagement standard
  "post.like": 3,
  "post.comment": 6,
  "post.share": 8,
  "post.save": 5,
  "post.expand": 1,
  "post.view_comments": 1.5,
  "post.click_link": 4,

  // Profil
  "profile.visit": 2,
  "user.follow": 10,

  // Communauté
  "circle.join": 8,
  "story.reaction": 2,
  "message.send": 7,

  // Marketplace
  "marketplace.favorite": 4,
  "marketplace.purchase": 15,

  // Jobs
  "job.save": 4,
  "job.apply": 12,

  // Search
  "search.click_result": 5,
  "search.query": 0.5,

  // Notifs
  "notification.click": 1,
};

/* Conversion dwell_ms en poids dwell (signal cumulatif).
 *  - 0-1s = 0 (passage)
 *  - 1-3s = 0.2 (regard)
 *  - 3-10s = 0.5 (intérêt)
 *  - 10s+ = 1.0 (lecture vraie)
 *  - 30s+ = 2.0 (engagement profond, vidéo regardée)
 */
export function dwellWeight(dwellMs: number): number {
  if (dwellMs >= 30_000) return 2.0;
  if (dwellMs >= 10_000) return 1.0;
  if (dwellMs >= 3_000) return 0.5;
  if (dwellMs >= 1_000) return 0.2;
  return 0;
}

/* Conversion video completion ratio en poids (exponentiel).
 *  25% = 0.5, 50% = 1.0, 75% = 1.5, 100% = 2.5, replay = 4.
 */
export function videoCompletionWeight(ratio: number): number {
  if (ratio >= 1.0) return 2.5;
  if (ratio >= 0.75) return 1.5;
  if (ratio >= 0.5) return 1.0;
  if (ratio >= 0.25) return 0.5;
  return 0;
}

/* Time decay exponentiel : un event vieux compte moins.
 *  half_life_days = 14 par défaut → un event d'il y a 14j compte 0.5,
 *  28j compte 0.25, etc.
 */
export function timeDecay(
  ageDays: number,
  halfLifeDays: number = 14,
): number {
  return Math.pow(0.5, ageDays / halfLifeDays);
}
