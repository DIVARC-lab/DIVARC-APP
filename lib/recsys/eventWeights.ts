/* Poids des events pour le calcul d'affinité.
 *
 * V1 (Pinterest/LinkedIn-style) : poids calibrés sur engagement explicite.
 * V2 (TikTok-style, Chantier Reels Recsys étape 1) : ajout des signaux vidéo
 * granulaires (quartiles, replay, skip_fast, scrub, unmute, fullscreen) qui
 * sont LE cœur du ranker Reels. Cf. lib/recsys/ranker.ts et le cahier
 * "TikTok playbook" pour les motivations.
 *
 * Convention de signes :
 *   - négatif fort  : -50 à -100 (report, block, hide)
 *   - négatif moyen : -10 à -30  (see_less, unmute_off, skip_fast)
 *   - faible signal : 0.1 à 2     (impression, dwell, scrub_forward)
 *   - engagement    : 3 à 9       (like, comment, save, share)
 *   - signal max    : 10 à 15     (follow, replay_multiple, sound_use) */

export const EVENT_WEIGHTS: Record<string, number> = {
  // === NÉGATIFS FORTS (exclusion / démotion massive) ===
  "post.report": -100,
  "user.block": -100,
  "user.report": -100,
  "post.hide": -30,
  "user.mute": -20,
  "post.see_less": -15,
  "post.not_interested": -10,
  "video.skip_fast": -8,
  "post.unlike": -2,
  "user.unfollow": -3,
  "circle.leave": -3,

  // === SIGNAUX FAIBLES POSITIFS (cumulatifs) ===
  "post.impression": 0.1,
  "video.impression": 0.1,
  "post.expand": 1,
  "post.view_comments": 1.5,
  "post.comments_scroll": 1.2,
  "video.skip_normal": -1, // skip 2-5s : signal mou négatif

  // === ENGAGEMENT EXPLICITE ===
  "post.like": 3,
  "post.love": 5, // réaction forte (Chantier Feed 4 reactions)
  "post.applause": 4,
  "post.insightful": 4.5,
  "post.surprised": 3.5,
  "post.sad": 3,
  "post.laugh": 4,
  "post.comment": 6,
  "post.comment_create": 6,
  "post.comment_like": 2,
  "post.save": 5,
  "post.share": 8,
  "post.share_external": 9, // partage WhatsApp/SMS = signal max
  "post.share_internal": 7, // partage à un ami DIVARC
  "post.click_link": 4,

  // === VIDÉO TikTok-style — Chantier Reels Recsys 1 ===
  "video.play_start": 0.5,
  "video.quartile_25": 1.0,
  "video.quartile_50": 2.0,
  "video.quartile_75": 3.5,
  "video.quartile_95": 5.0,
  "video.completion": 7.0,
  "video.replay": 10.0, // signal très fort
  "video.replay_multiple": 15.0, // signal MAX (3+ replays)
  "video.unmute": 2.0,
  "video.fullscreen": 2.5,
  "video.scrub_forward": 0.5,
  "video.scrub_backward": 3.0, // veut revoir une partie = très fort
  "video.long_press_pause": 1.5,
  "video.pause": 0.3,

  // === SOCIAL (Network) ===
  "user.follow": 15,
  "user.profile_visit": 2,
  "user.profile_dwell": 1, // weight × seconds via dwellWeight
  "profile.visit": 2, // legacy alias
  "user.message_send": 5,

  // === SOUND / HASHTAG (Reels signals) ===
  "sound.use": 12, // crée un reel avec ce son = très fort
  "sound.save": 4,
  "hashtag.follow": 5,
  "hashtag.click": 1,

  // === COMMUNAUTÉ ===
  "circle.join": 8,
  "story.reaction": 2,
  "message.send": 7,

  // === MARKETPLACE / JOBS ===
  "marketplace.favorite": 4,
  "marketplace.purchase": 15,
  "job.save": 4,
  "job.apply": 12,

  // === SEARCH (signaux d'intention) ===
  "search.query": 0.5,
  "search.click_result": 6, // clic après recherche = intent fort
  "search.dwell_result": 3,

  // === NOTIFS ===
  "notification.click": 1,

  // === Sprint Recsys 2026 — Events lifecycle additionnels ===
  // Pas de poids direct sur le ranker pour les events session/app
  // (purement analytics), mais on les insère pour le user profile builder
  // (active_hours, sessions_per_day, session_duration_avg).
  "session.start": 0,
  "session.end": 0,
  "app.foreground": 0,
  "app.background": 0,

  // Feed navigation — signal d'intérêt mou si refresh fréquent.
  "feed.refresh": 0.2,
  "feed.end_reached": 0.3,
  "feed.scroll_back_to_top": 0.5,

  // Geo — signal contextuel, pas direct.
  "geo.location_updated": 0,
  "geo.place_detected": 0.3,
  "location.follow": 5,

  // Cercle interactions implicites.
  "circle.visit": 1,
  "circle.dwell": 1.5,

  // Search / Post interactions implicites.
  "search.refine": 1.5,
  "post.double_tap": 3, // = post.like rapide
  "post.long_press": 0.8, // = ouverture reaction picker

  // Relations sociales fines.
  "user.close_friend_add": 10, // signal très fort
  "user.close_friend_remove": -3,
};

/* Set d'events critiques qui doivent flush immédiatement le batch (pas
 * d'attente du timer 5s). Utilisé par EventTracker.track(). */
export const CRITICAL_EVENT_TYPES = new Set<string>([
  "post.report",
  "user.block",
  "user.report",
  "post.hide",
  "user.mute",
  "post.see_less",
  "post.not_interested",
  "user.follow",
  "user.unfollow",
  "video.replay_multiple",
  "post.share_external",
]);

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
