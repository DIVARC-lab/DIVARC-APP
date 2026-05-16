/* eventTypes.ts — Chantier Reels Recsys étape 1.
 *
 * Catalogue centralisé des EventType supportés par le SDK et le ranker.
 * Source de vérité pour :
 *   - autocompletion côté appels tracker.track(...)
 *   - tests d'exhaustivité côté worker recsys
 *   - documentation des signaux disponibles
 *
 * Les poids associés sont dans lib/recsys/eventWeights.ts.
 * Les events vidéo TikTok-style (quartiles, replay, skip_fast) sont
 * tracés via le hook useVideoTracking (lib/hooks/useVideoTracking.ts).
 */

export const EVENT_TYPES = {
  /* === NÉGATIFS FORTS === */
  POST_REPORT: "post.report",
  POST_HIDE: "post.hide",
  POST_SEE_LESS: "post.see_less",
  POST_NOT_INTERESTED: "post.not_interested",
  USER_BLOCK: "user.block",
  USER_REPORT: "user.report",
  USER_MUTE: "user.mute",
  USER_UNFOLLOW: "user.unfollow",

  /* === IMPRESSIONS & DWELL (signaux faibles cumulatifs) === */
  POST_IMPRESSION: "post.impression",
  POST_DWELL_TIME: "post.dwell_time",
  VIDEO_IMPRESSION: "video.impression",

  /* === ENGAGEMENT EXPLICITE === */
  POST_LIKE: "post.like",
  POST_UNLIKE: "post.unlike",
  POST_LOVE: "post.love",
  POST_APPLAUSE: "post.applause",
  POST_INSIGHTFUL: "post.insightful",
  POST_SURPRISED: "post.surprised",
  POST_SAD: "post.sad",
  POST_LAUGH: "post.laugh",
  POST_COMMENT: "post.comment",
  POST_COMMENT_CREATE: "post.comment_create",
  POST_COMMENT_LIKE: "post.comment_like",
  POST_SAVE: "post.save",
  POST_SHARE: "post.share",
  POST_SHARE_INTERNAL: "post.share_internal",
  POST_SHARE_EXTERNAL: "post.share_external",
  POST_EXPAND: "post.expand",
  POST_VIEW_COMMENTS: "post.view_comments",
  POST_COMMENTS_SCROLL: "post.comments_scroll",
  POST_CLICK_LINK: "post.click_link",

  /* === VIDÉO TikTok-style === */
  VIDEO_PLAY_START: "video.play_start",
  VIDEO_QUARTILE_25: "video.quartile_25",
  VIDEO_QUARTILE_50: "video.quartile_50",
  VIDEO_QUARTILE_75: "video.quartile_75",
  VIDEO_QUARTILE_95: "video.quartile_95",
  VIDEO_COMPLETION: "video.completion",
  VIDEO_REPLAY: "video.replay",
  VIDEO_REPLAY_MULTIPLE: "video.replay_multiple",
  VIDEO_SKIP_FAST: "video.skip_fast",
  VIDEO_SKIP_NORMAL: "video.skip_normal",
  VIDEO_UNMUTE: "video.unmute",
  VIDEO_FULLSCREEN: "video.fullscreen",
  VIDEO_SCRUB_FORWARD: "video.scrub_forward",
  VIDEO_SCRUB_BACKWARD: "video.scrub_backward",
  VIDEO_PAUSE: "video.pause",
  VIDEO_LONG_PRESS_PAUSE: "video.long_press_pause",

  /* === SOCIAL === */
  USER_FOLLOW: "user.follow",
  USER_PROFILE_VISIT: "user.profile_visit",
  USER_PROFILE_DWELL: "user.profile_dwell",
  PROFILE_VISIT: "profile.visit",
  USER_MESSAGE_SEND: "user.message_send",

  /* === SOUND / HASHTAG === */
  SOUND_USE: "sound.use",
  SOUND_SAVE: "sound.save",
  HASHTAG_FOLLOW: "hashtag.follow",
  HASHTAG_CLICK: "hashtag.click",

  /* === COMMUNAUTÉ === */
  CIRCLE_JOIN: "circle.join",
  CIRCLE_LEAVE: "circle.leave",
  STORY_REACTION: "story.reaction",
  MESSAGE_SEND: "message.send",

  /* === MARKETPLACE / JOBS === */
  MARKETPLACE_FAVORITE: "marketplace.favorite",
  MARKETPLACE_PURCHASE: "marketplace.purchase",
  JOB_SAVE: "job.save",
  JOB_APPLY: "job.apply",

  /* === SEARCH === */
  SEARCH_QUERY: "search.query",
  SEARCH_CLICK_RESULT: "search.click_result",
  SEARCH_DWELL_RESULT: "search.dwell_result",

  /* === NOTIFS === */
  NOTIFICATION_CLICK: "notification.click",

  /* === Sprint Recsys 2026 — Events lifecycle additionnels ===
     Couvre les besoins du brief moteur de recommandation : tracking
     session, app foreground/background, navigation feed, geo
     positionnel, et signaux de proximité sociale fins. */

  /* Session / App lifecycle. */
  SESSION_START: "session.start",
  SESSION_END: "session.end",
  APP_FOREGROUND: "app.foreground",
  APP_BACKGROUND: "app.background",

  /* Feed navigation. */
  FEED_REFRESH: "feed.refresh",
  FEED_END_REACHED: "feed.end_reached",
  FEED_SCROLL_BACK_TO_TOP: "feed.scroll_back_to_top",

  /* Geo. */
  GEO_LOCATION_UPDATED: "geo.location_updated",
  GEO_PLACE_DETECTED: "geo.place_detected",
  LOCATION_FOLLOW: "location.follow",

  /* Cercle interactions implicites. */
  CIRCLE_VISIT: "circle.visit",
  CIRCLE_DWELL: "circle.dwell",

  /* Search / Post interactions implicites. */
  SEARCH_REFINE: "search.refine",
  POST_DOUBLE_TAP: "post.double_tap",
  POST_LONG_PRESS: "post.long_press",

  /* Relations sociales fines. */
  USER_CLOSE_FRIEND_ADD: "user.close_friend_add",
  USER_CLOSE_FRIEND_REMOVE: "user.close_friend_remove",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
