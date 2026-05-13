export type Locale =
  | "fr-FR"
  | "fr-CA"
  | "fr-BE"
  | "fr-CH"
  | "fr-MA"
  | "fr-SN"
  | "fr-CI"
  | "fr-CM"
  | "fr-DZ"
  | "fr-TN";

export type Currency =
  | "EUR"
  | "XAF"
  | "XOF"
  | "MAD"
  | "TND"
  | "DZD"
  | "CAD"
  | "CHF";

export type Theme = "light" | "dark" | "system";

export type PresenceStatus = "online" | "away" | "offline";
export type CustomStatus = "available" | "busy" | "dnd" | "invisible";
export type PresenceVisibility = "everyone" | "friends" | "nobody";

/* Profil v2 — Migration 0063 */
export type ProfileFacet =
  | "particulier"
  | "professionnel"
  | "createur"
  | "vendeur"
  | "mentor"
  | "recruteur"
  | "entrepreneur";

export type ProfileCoverGradient =
  | "navy_gold"
  | "sunset"
  | "ocean"
  | "forest"
  | "rose"
  | "aurora"
  | "cream_navy"
  | "noir"
  | "cyber";

export type ProfileSocialLinkKind =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "github"
  | "youtube"
  | "tiktok"
  | "behance"
  | "dribbble"
  | "mastodon"
  | "bluesky"
  | "custom";

export type ProfileSocialLink = {
  kind: ProfileSocialLinkKind;
  url: string;
  label?: string;
};

export type ProfileSectionVisibility =
  | "public"
  | "friends"
  | "friends_of_friends"
  | "private"
  | "custom";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  locale: Locale;
  currency: Currency;
  theme: Theme;
  email_notifications: boolean;
  push_notifications: boolean;
  discoverable: boolean;
  show_email: boolean;
  show_location: boolean;
  founder_rank: number | null;
  onboarded_at: string | null;
  presence_status: PresenceStatus;
  last_seen_at: string | null;
  custom_status: CustomStatus;
  presence_visibility: PresenceVisibility;
  headline: string | null;
  open_to_work: boolean;
  open_to_hiring: boolean;
  discrete_search: boolean;
  intro_video_url: string | null;
  intro_video_thumbnail_url: string | null;
  intro_video_duration_ms: number | null;
  intro_video_uploaded_at: string | null;
  interests: string[];
  /* Profil étendu (migration 0063 — Profil v2) */
  pronouns: string | null;
  cover_photo_url: string | null;
  cover_gradient: ProfileCoverGradient | null;
  website: string | null;
  social_links: ProfileSocialLink[];
  sections_order: string[] | null;
  sections_visibility: Record<string, ProfileSectionVisibility>;
  profile_completion_score: number;
  facets: ProfileFacet[];
  primary_facet: ProfileFacet;
  /* Compteurs follows asymétriques (migration 0067, dénormalisés) */
  followers_count: number;
  following_count: number;
  /* Suppression compte avec grâce 30j (migration 0072). */
  scheduled_deletion_at: string | null;
  deletion_requested_at: string | null;
  /* Trust & Safety (migration 0047) */
  email_verified_at: string | null;
  phone_verified_at: string | null;
  phone_number: string | null;
  identity_verified_at: string | null;
  identity_verification_provider: string | null;
  warnings_count: number;
  content_removed_count: number;
  timeouts_received: number;
  trust_score: number;
  trust_score_updated_at: string | null;
  /* Chantier 5 (migration 0087) — Stripe Connect Express. */
  stripe_connect_account_id: string | null;
  stripe_connect_status:
    | "not_started"
    | "onboarding"
    | "restricted"
    | "enabled"
    | "disabled";
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_connect_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PresenceInfo = {
  user_id: string;
  presence_status: PresenceStatus;
  last_seen_at: string | null;
  custom_status: CustomStatus;
};

export type ProfileIdentityUpdate = Partial<
  Pick<
    Profile,
    | "username"
    | "full_name"
    | "bio"
    | "location"
    | "avatar_url"
    | "onboarded_at"
    | "headline"
    | "open_to_work"
    | "open_to_hiring"
    | "discrete_search"
    | "intro_video_url"
    | "intro_video_thumbnail_url"
    | "intro_video_duration_ms"
    | "intro_video_uploaded_at"
    | "pronouns"
    | "cover_photo_url"
    | "cover_gradient"
    | "website"
    | "social_links"
    | "sections_order"
    | "sections_visibility"
    | "facets"
    | "primary_facet"
  >
>;

export type ProfilePreferencesUpdate = Partial<
  Pick<
    Profile,
    | "locale"
    | "currency"
    | "theme"
    | "email_notifications"
    | "push_notifications"
    | "discoverable"
    | "show_email"
    | "show_location"
    | "custom_status"
    | "presence_visibility"
    | "interests"
  >
>;

export type ProfileTrustUpdate = Partial<
  Pick<
    Profile,
    | "email_verified_at"
    | "phone_verified_at"
    | "phone_number"
    | "identity_verified_at"
    | "identity_verification_provider"
    | "warnings_count"
    | "content_removed_count"
    | "timeouts_received"
    | "trust_score"
    | "trust_score_updated_at"
  >
>;

/* Chantier 5 — Stripe Connect update partial. */
export type ProfileStripeUpdate = Partial<
  Pick<
    Profile,
    | "stripe_connect_account_id"
    | "stripe_connect_status"
    | "stripe_charges_enabled"
    | "stripe_payouts_enabled"
    | "stripe_details_submitted"
    | "stripe_connect_updated_at"
  >
>;

export type ProfileUpdate = ProfileIdentityUpdate &
  ProfilePreferencesUpdate &
  ProfileTrustUpdate &
  ProfileStripeUpdate;

/* Migration 0003 (base) + 0073 (étendu Chantier 1) + 0089 (listing_chat). */
export type ConversationType =
  | "direct"
  | "group"
  | "self"
  | "broadcast"
  | "channel"
  | "listing_chat";

export type MemberRole = "owner" | "admin" | "member";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "audio"
  | "document"
  | "location"
  | "location_live"
  | "contact"
  | "poll"
  | "sticker"
  | "gif"
  | "link"
  | "payment"
  | "system"
  | "call_record";

export type MessageDeliveryStatusValue =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/* Map { user_id: status } stocké en jsonb sur messages.delivery_status. */
export type MessageDeliveryStatusMap = Record<
  string,
  MessageDeliveryStatusValue
>;

/* Signal Protocol — Chantier 1.2 (migration 0074). Clés PUBLIQUES
 * stockées côté serveur. Les privées sont dans IndexedDB chiffré côté
 * client UNIQUEMENT — le serveur ne les voit jamais. */
export type SignalIdentityKey = {
  user_id: string;
  public_key: string;
  registration_id: number;
  device_id: number;
  created_at: string;
  updated_at: string;
};

export type SignalSignedPreKeyStatus = "active" | "rotated" | "compromised";

export type SignalSignedPreKey = {
  id: string;
  user_id: string;
  prekey_id: number;
  public_key: string;
  signature: string;
  status: SignalSignedPreKeyStatus;
  created_at: string;
  rotated_at: string | null;
};

export type SignalOneTimePreKey = {
  id: string;
  user_id: string;
  prekey_id: number;
  public_key: string;
  consumed_at: string | null;
  consumed_by_user_id: string | null;
  created_at: string;
};

export type SignalSession = {
  id: string;
  conversation_id: string;
  user_a: string;
  user_b: string;
  established_at: string;
  last_message_at: string | null;
  last_ratchet_at: string | null;
  message_count: number;
  is_compromised: boolean;
  compromised_at: string | null;
};

export type SignalSafetyNumber = {
  id: string;
  user_a: string;
  user_b: string;
  safety_number: string;
  safety_number_hash: string;
  verified_by_a: boolean;
  verified_by_b: boolean;
  verified_a_at: string | null;
  verified_b_at: string | null;
  changed_at: string | null;
  created_at: string;
};

/* PreKeyBundle retourné par RPC get_prekey_bundle — c'est ce dont le
 * client Bob a besoin pour démarrer une session X3DH avec Alice. */
export type SignalPreKeyBundle = {
  identity_key: string;
  registration_id: number;
  device_id: number;
  signed_prekey: {
    key_id: number;
    public_key: string;
    signature: string;
  };
  /* Peut être null si le pool est vide (X3DH fallback dégradé). */
  one_time_prekey: {
    prekey_id: number;
    public_key: string;
  } | null;
};
export type FriendshipStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type NotificationType =
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | "new_message"
  | "moderation_decision"
  | "moderation_report_resolved"
  | "moderation_appeal_resolved"
  | "system"
  | "post_liked"
  | "post_commented"
  | "post_mention"
  | "reel_liked"
  | "reel_commented"
  | "reel_comment_replied"
  | "reel_comment_liked"
  | "reel_mention"
  /* Migration 0090 — événements marketplace. */
  | "marketplace_offer_received"
  | "marketplace_offer_accepted"
  | "marketplace_offer_declined"
  | "marketplace_offer_countered"
  | "marketplace_offer_withdrawn"
  /* Migration 0106 — digest hebdomadaire cercle. */
  | "circle_weekly_digest";

export type PostVisibility = "public" | "friends" | "private";

/* Chantier Feed v2.3 — modes du feed transparent. Cf. /about/feed-algorithm. */
export type FeedMode =
  | "fresh"
  | "conversations"
  | "rising_voices"
  | "inner_circle"
  | "raw";

export type FeedV2Item = {
  post_id: string;
  score: number | null;
  reason: string | null;
};

/* Chantier Feed v2.5 — découverte explicable (RPC discover_posts). */
export type DiscoverReasonType =
  | "trending_diverse"
  | "friend_echo"
  | "rising_voice";

export type DiscoverReasonData =
  | {
      type: "trending_diverse";
      commenters: number;
      reactors: number;
    }
  | {
      type: "friend_echo";
      friend_reactors: number;
    }
  | {
      type: "rising_voice";
      author_friends: number;
      external_reactions: number;
    };

export type DiscoverItem = {
  post_id: string;
  score: number | null;
  reason_type: DiscoverReasonType;
  reason_data: Record<string, number>;
};

export type PostBackgroundColor =
  | "navy"
  | "gold"
  | "cream"
  | "gradient_dawn"
  | "gradient_dusk"
  | "gradient_ocean"
  | "gradient_forest"
  | "gradient_rose";

export type PostActivityType =
  | "watching"
  | "listening"
  | "playing"
  | "reading"
  | "eating"
  | "traveling"
  | "celebrating"
  | "feeling";

export type PostStatus = "draft" | "scheduled" | "published" | "archived";

/* Open Graph metadata détectée à la publication, persistée dans
   posts.link_preview jsonb. */
export type PostLinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
  fetched_at: string;
};

/* Une slide individuelle d'un carrousel. Stockée dans
   posts.carousel_slides jsonb (array). */
export type PostCarouselSlide = {
  position: number;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  cta_label?: string;
  cta_url?: string;
};

/* Chantier Feed v2 (migration 0111) — reactions 6 types. */
export type PostReactionType =
  | "heart"
  | "applause"
  | "insightful"
  | "surprised"
  | "sad"
  | "laugh";

export type PostReaction = {
  post_id: string;
  user_id: string;
  reaction_type: PostReactionType;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  body: string | null;
  visibility: PostVisibility;
  video_url: string | null;
  video_thumbnail_url: string | null;
  video_duration_ms: number | null;
  video_width: number | null;
  video_height: number | null;
  /* V4 — Transcoding HLS (migration 0053). */
  video_hls_url: string | null;
  video_provider_asset_id: string | null;
  video_status: "pending" | "transcoding" | "ready" | "failed" | null;
  video_error: string | null;
  video_blurhash: string | null;
  circle_id: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  /* V4 — Posts enrichis (migration 0052). */
  background_color: PostBackgroundColor | null;
  sentiment_emoji: string | null;
  sentiment_label: string | null;
  activity_type: PostActivityType | null;
  activity_detail: string | null;
  location_name: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  link_preview: PostLinkPreview | null;
  audience_excluded_user_ids: string[];
  is_carousel: boolean;
  carousel_slides: PostCarouselSlide[] | null;
  scheduled_for: string | null;
  published_at: string | null;
  status: PostStatus;
  /* Chantier 3 cercles (migration 0093) — curation circle posts. */
  flair_id: string | null;
  is_locked: boolean;
  is_announcement: boolean;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  upvotes: number;
  downvotes: number;
  helpful_marks: number;
  /* Chantier Feed v2 (migration 0110). */
  post_kind: "standard" | "article" | "thread" | "longform";
  thread_root_id: string | null;
  thread_reply_to_id: string | null;
  thread_position: number | null;
  reading_time_minutes: number | null;
  audience_snapshot: Record<string, unknown> | null;
  /* Chantier Feed v2 (migration 0111) — reactions 6 types. */
  reactions_counts: Partial<Record<PostReactionType, number>>;
  total_reactions: number;
  /* Chantier Feed v2 (migration 0115) — quote-post. */
  quoted_post_id: string | null;
  quotes_count: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

/* Tag d'utilisateurs dans un post (avec position optionnelle si tag
   sur photo Facebook-style). */
export type PostTaggedUser = {
  id: string;
  post_id: string;
  user_id: string;
  photo_id: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
};

export type PostPoll = {
  id: string;
  post_id: string;
  question: string;
  multi_choice: boolean;
  is_anonymous: boolean;
  ends_at: string | null;
  total_votes: number;
  created_at: string;
  /* Chantier Feed v2 — migration 0113. */
  is_closed: boolean;
};

export type PostPollOption = {
  id: string;
  poll_id: string;
  position: number;
  label: string;
  votes_count: number;
  created_at: string;
  /* Chantier Feed v2 — migration 0113. */
  emoji: string | null;
};

export type PostPollVote = {
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

export type PostPhoto = {
  id: string;
  post_id: string;
  url: string;
  position: number;
  created_at: string;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
};

export type PostLike = {
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

// =============== Pro features (B.9 → B.13) ===============

export type ProConnectionStatus = "pending" | "accepted" | "rejected";
export type ProConnectionContext =
  | "colleague"
  | "manager"
  | "report"
  | "client"
  | "partner"
  | "other";

export type ProConnection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  context: ProConnectionContext | null;
  intro: string | null;
  status: ProConnectionStatus;
  created_at: string;
  responded_at: string | null;
};

export type ProConnectionWithProfile = ProConnection & {
  other: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url" | "headline" | "location"
  >;
};

export type MentorOffer = {
  id: string;
  user_id: string;
  bio: string;
  topics: string[];
  hourly_rate: number | null;
  rate_currency: Currency | null;
  languages: string[];
  is_available: boolean;
  sessions_count: number;
  rating_avg: number | null;
  created_at: string;
  updated_at: string;
};

export type MentorOfferWithProfile = MentorOffer & {
  profile: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url" | "headline" | "location"
  > | null;
};

export type MentorSessionStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "completed"
  | "cancelled";

export type MentorSession = {
  id: string;
  mentor_id: string;
  mentee_id: string;
  topic: string;
  message: string | null;
  scheduled_at: string | null;
  duration_min: number;
  status: MentorSessionStatus;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
};

export type SkillQuiz = {
  id: string;
  slug: string;
  skill_name: string;
  title: string;
  description: string | null;
  pass_score: number;
  question_count: number;
  duration_min: number;
  created_at: string;
};

export type SkillQuizQuestion = {
  id: string;
  quiz_id: string;
  position_order: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_at: string;
};

export type SkillQuizAttempt = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  passed: boolean;
  answers: number[] | null;
  started_at: string;
  finished_at: string;
};

export type UserSkillBadge = {
  user_id: string;
  quiz_id: string;
  skill_name: string;
  slug: string;
  title: string;
  best_score: number;
  total: number;
  passed: boolean;
  last_attempt_at: string;
};

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export type LiveSession = {
  id: string;
  host_id: string;
  company_id: string | null;
  job_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_min: number;
  status: LiveSessionStatus;
  attendees_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type LiveSessionMessage = {
  id: string;
  session_id: string;
  user_id: string;
  body: string;
  is_question: boolean;
  created_at: string;
};

export type LiveSessionMessageWithAuthor = LiveSessionMessage & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

export type PostCollectionColorTheme =
  | "warm"
  | "cool"
  | "mono"
  | "earth"
  | "berry";

export type PostCollection = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  is_private: boolean;
  bookmarks_count: number;
  position_order: number;
  created_at: string;
  /* Chantier Feed v2 — migration 0112. */
  cover_url: string | null;
  description: string | null;
  is_archived: boolean;
  share_slug: string | null;
  color_theme: PostCollectionColorTheme;
  last_post_at: string | null;
};

export type PostBookmarkReadingState = "to_read" | "reading" | "done";

export type PostBookmark = {
  user_id: string;
  post_id: string;
  collection_id: string | null;
  created_at: string;
  /* Chantier Feed v2 — migration 0112. */
  reading_state: PostBookmarkReadingState;
  note: string | null;
  last_seen_at: string | null;
};

export type Hashtag = {
  id: string;
  tag: string;
  posts_count: number;
  created_at: string;
};

export type PostHashtag = {
  post_id: string;
  hashtag_id: string;
  created_at: string;
};

export type PostMention = {
  post_id: string;
  user_id: string;
  created_at: string;
};

/* ============================================================
 * Reels (migration 0054_reels) — TikTok-grade vidéos verticales 9:16.
 * ============================================================ */

export type SoundSource =
  | "pixabay"
  | "unsplash_audio"
  | "epidemic_sound"
  | "user_original"
  | "sound_effect";

export type Sound = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  audio_url: string;
  artwork_url: string | null;
  source: SoundSource;
  license_info: Record<string, unknown>;
  usage_count: number;
  is_explicit: boolean;
  created_by: string | null;
  source_reel_id: string | null;
  created_at: string;
};

export type ReelAudience = "public" | "friends" | "private";
export type ReelModerationStatus =
  | "pending"
  | "approved"
  | "flagged"
  | "hidden";
export type ReelStatus = "draft" | "scheduled" | "published" | "archived";
export type ReelAspectRatio = "9:16" | "1:1" | "4:5" | "16:9";
export type ReelDuetLayout = "right" | "left" | "top" | "bottom";

export type Reel = {
  id: string;
  author_id: string;
  video_url: string;
  video_mp4_fallback: string | null;
  duration_seconds: number;
  aspect_ratio: ReelAspectRatio;
  poster_url: string | null;
  blurhash: string | null;
  description: string | null;
  hashtags: string[];
  mentioned_users: string[];
  location_name: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sound_id: string | null;
  has_voiceover: boolean;
  effects_used: string[];
  allow_comments: boolean;
  allow_duets: boolean;
  allow_stitches: boolean;
  allow_downloads: boolean;
  audience: ReelAudience;
  views_count: number;
  plays_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  duets_count: number;
  stitches_count: number;
  moderation_status: ReelModerationStatus;
  moderation_reason: string | null;
  status: ReelStatus;
  scheduled_for: string | null;
  /* V3.6 — text overlays jsonb (migration 0058). Array stocké tel quel,
     parsé via parseOverlays() côté client pour validation. */
  text_overlays: unknown;
  /* V3.7 — voix off + mix volumes (migration 0059). */
  voiceover_url: string | null;
  video_volume: number;
  voiceover_volume: number;
  /* V3.8 — mode Duo (migration 0060). */
  duet_source_reel_id: string | null;
  duet_layout: ReelDuetLayout | null;
  /* V3.9 — stickers jsonb (migration 0061), parsé via parseStickers(). */
  stickers: unknown;
  /* V3.13 — audio fingerprinting (migration 0062). */
  fingerprint_status:
    | "pending"
    | "processing"
    | "ok"
    | "copyrighted"
    | "error"
    | null;
  fingerprint_hash: string | null;
  copyright_match_id: string | null;
  copyright_match_details: unknown;
  fingerprinted_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReelLike = {
  reel_id: string;
  user_id: string;
  created_at: string;
};

export type ReelSave = {
  reel_id: string;
  user_id: string;
  created_at: string;
};

export type ReelView = {
  id: string;
  reel_id: string;
  user_id: string;
  watch_ms: number;
  completed_pct: number;
  replay_count: number;
  skipped: boolean;
  did_like: boolean;
  did_save: boolean;
  did_share: boolean;
  did_comment: boolean;
  viewed_at: string;
};

export type ReelComment = {
  id: string;
  reel_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type ReelDuet = {
  id: string;
  source_reel_id: string;
  duet_reel_id: string;
  layout: ReelDuetLayout;
  created_at: string;
};

export type ReelStitch = {
  id: string;
  source_reel_id: string;
  stitch_reel_id: string;
  segment_start_ms: number;
  segment_end_ms: number;
  created_at: string;
};

export type ReelCommentLike = {
  comment_id: string;
  user_id: string;
  created_at: string;
};

export type ReelWithDetails = Reel & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  sound: Pick<Sound, "id" | "title" | "artist" | "audio_url"> | null;
  is_liked: boolean;
  is_saved: boolean;
  /* V3.8 — si duet_source_reel_id est défini, on hydrate la source pour
     pouvoir render side-by-side au playback. */
  duet_source?: {
    id: string;
    video_url: string;
    video_mp4_fallback: string | null;
    author_username: string | null;
  } | null;
};

export type PostPollWithDetails = PostPoll & {
  options: PostPollOption[];
  user_voted_option_ids: string[];
};

export type PostTaggedUserDetail = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type PostWithDetails = Post & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  photos: PostPhoto[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  /* V4 — plugins enrichis (Phase 1.6/1.7). Optionnels : null/undefined
     si non hydratés par la query. */
  poll?: PostPollWithDetails | null;
  tagged_users?: PostTaggedUserDetail[];
};

export type CommentWithAuthor = PostComment & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

export type JobType =
  | "cdi"
  | "cdd"
  | "freelance"
  | "mission"
  | "alternance"
  | "stage"
  | "benevolat";

export type WorkMode = "on_site" | "remote" | "hybrid";

export type ExperienceLevel =
  | "debutant"
  | "junior"
  | "intermediaire"
  | "senior"
  | "expert";

export type SalaryPeriod = "hour" | "day" | "month" | "year" | "project";

export type JobStatus = "draft" | "active" | "closed" | "archived";

export type JobCategory =
  | "tech"
  | "design"
  | "marketing"
  | "ventes"
  | "rh"
  | "finance"
  | "juridique"
  | "conseil"
  | "enseignement"
  | "sante"
  | "artisanat"
  | "restauration"
  | "transport"
  | "service"
  | "autre";

export type Job = {
  id: string;
  poster_id: string;
  title: string;
  company_name: string | null;
  company_id: string | null;
  description: string;
  job_type: JobType;
  work_mode: WorkMode;
  category: JobCategory;
  experience_level: ExperienceLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: Currency | null;
  salary_period: SalaryPeriod | null;
  location: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  /* Chantier 3.4 — rattachement optionnel à un cercle (migration 0097). */
  circle_id: string | null;
};

export type JobApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type JobApplication = {
  id: string;
  job_id: string;
  applicant_id: string;
  message: string | null;
  status: JobApplicationStatus;
  created_at: string;
  responded_at: string | null;
};

export type JobApplicationWithApplicant = JobApplication & {
  applicant: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url" | "bio" | "location"
  > | null;
};

export type JobWithDetails = Job & {
  poster: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  applications_count: number;
  is_saved: boolean;
  has_applied: boolean;
  my_application: Pick<
    JobApplication,
    "id" | "status" | "created_at" | "message"
  > | null;
};

// =============== Companies ===============

export type CompanySize =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1001-5000"
  | "5001-10000"
  | "10000+";

export type Company = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  industry: string | null;
  size_label: CompanySize | null;
  headquarters: string | null;
  founded_year: number | null;
  owner_id: string;
  verified: boolean;
  followers_count: number;
  created_at: string;
  updated_at: string;
};

export type CompanyFollower = {
  company_id: string;
  user_id: string;
  created_at: string;
};

// =============== Profil pro enrichi ===============

export type EmploymentType =
  | "cdi"
  | "cdd"
  | "freelance"
  | "mission"
  | "alternance"
  | "stage"
  | "benevolat";

export type SkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type LanguageLevel =
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2"
  | "native";

export type ProfileExperience = {
  id: string;
  user_id: string;
  title: string;
  company_name: string;
  company_id: string | null;
  employment_type: EmploymentType | null;
  work_mode: WorkMode | null;
  location: string | null;
  description: string | null;
  start_month: string;
  end_month: string | null;
  is_current: boolean;
  position_order: number;
  created_at: string;
};

export type ProfileEducation = {
  id: string;
  user_id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  description: string | null;
  position_order: number;
  created_at: string;
};

export type ProfileSkill = {
  id: string;
  user_id: string;
  name: string;
  level: SkillLevel | null;
  position_order: number;
  endorsements_count: number;
  created_at: string;
};

export type SkillEndorsement = {
  skill_id: string;
  endorser_id: string;
  created_at: string;
};

export type ProfileLanguage = {
  id: string;
  user_id: string;
  name: string;
  level: LanguageLevel;
  position_order: number;
  created_at: string;
};

export type ProfileCertification = {
  id: string;
  user_id: string;
  name: string;
  issuer: string;
  issued_month: string | null;
  expires_month: string | null;
  credential_url: string | null;
  position_order: number;
  created_at: string;
};

// =============== Saved searches ===============

export type JobSavedSearch = {
  id: string;
  user_id: string;
  label: string;
  query: string | null;
  category: string | null;
  job_type: string | null;
  work_mode: string | null;
  experience_level: string | null;
  location: string | null;
  alerts_enabled: boolean;
  last_notified_at: string | null;
  created_at: string;
};

// =============== Job referrals (cooptation) ===============

export type JobReferral = {
  id: string;
  job_id: string;
  referrer_id: string;
  referred_id: string;
  message: string | null;
  created_at: string;
  acknowledged_at: string | null;
  application_id: string | null;
};

export type JobReferralWithDetails = JobReferral & {
  referrer: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  referred: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  job: Pick<Job, "id" | "title" | "company_name"> | null;
};

// =============== Profile views ===============

export type ProfileView = {
  viewer_id: string;
  viewed_id: string;
  last_viewed_at: string;
  view_count: number;
};

export type ProfileViewWithViewer = ProfileView & {
  viewer: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url" | "headline" | "location"
  > | null;
};

export type TransactionType =
  | "transfer"
  | "topup"
  | "refund"
  | "fee"
  | "welcome_credit";

export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

export type Wallet = {
  user_id: string;
  currency: Currency;
  balance: number;
  updated_at: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  sender_id: string | null;
  recipient_id: string | null;
  currency: Currency;
  amount: number;
  description: string | null;
  status: TransactionStatus;
  created_at: string;
};

export type TransactionWithCounterparty = Transaction & {
  counterparty: Pick<
    Profile,
    "id" | "full_name" | "username" | "avatar_url"
  > | null;
  direction: "incoming" | "outgoing" | "credit";
};

export type StoryType = "photo" | "text" | "video";

export type StoryFilter =
  | "original"
  | "dore"
  | "creme"
  | "nuit"
  | "pellicule"
  | "argent";

export type StoryCaptionPosition = {
  x: number; // 0..1, fraction of container width
  y: number; // 0..1, fraction of container height
  scale: number; // 0.5..2
};

export type StorySticker = {
  emoji: string;
  x: number; // 0..1
  y: number; // 0..1
  scale: number; // 0.5..3
  rotation: number; // degrees
};

export type Story = {
  id: string;
  author_id: string;
  type: StoryType;
  photo_url: string | null;
  caption: string | null;
  caption_position: StoryCaptionPosition | null;
  stickers: StorySticker[];
  background: string | null;
  filter: StoryFilter | null;
  video_url: string | null;
  video_thumbnail_url: string | null;
  video_duration_ms: number | null;
  created_at: string;
  expires_at: string;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
};

export type StoryView = {
  story_id: string;
  viewer_id: string;
  viewed_at: string;
};

export type StoryWithAuthor = Story & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  is_viewed: boolean;
  views_count: number;
};

export type StoryGroup = {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  stories: StoryWithAuthor[];
  has_unviewed: boolean;
};

/* Highlights (migration 0064) — stories épinglées sur le profil. */
export type StoryHighlight = {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string;
  sort_position: number;
  items_count: number;
  created_at: string;
  updated_at: string;
};

export type StoryHighlightItem = {
  highlight_id: string;
  story_id: string;
  sort_position: number;
  added_at: string;
};

export type StoryHighlightWithStoryIds = StoryHighlight & {
  story_ids: string[];
};

/* Recommendations LinkedIn-style (migration 0065). */
export type RecommendationRelationship =
  | "manager"
  | "report"
  | "colleague"
  | "client"
  | "supplier"
  | "mentor"
  | "mentee"
  | "classmate"
  | "professor"
  | "student"
  | "collaborator"
  | "business_partner"
  | "friend"
  | "custom";

export type ProfileRecommendation = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  relationship: RecommendationRelationship;
  relationship_custom: string | null;
  body: string;
  is_visible: boolean;
  given_at: string;
  updated_at: string;
};

export type ProfileRecommendationWithAuthor = ProfileRecommendation & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "headline">;
};

/* Sections étendues (migration 0066). */
export type ProfileProject = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_month: string | null;
  end_month: string | null;
  is_ongoing: boolean;
  demo_url: string | null;
  source_url: string | null;
  tech_tags: string[];
  media_urls: string[];
  position_order: number;
  created_at: string;
};

export type PublicationMediaType =
  | "book"
  | "article"
  | "podcast"
  | "research_paper"
  | "blog_post"
  | "white_paper"
  | "other";

export type ProfilePublication = {
  id: string;
  user_id: string;
  title: string;
  media_type: PublicationMediaType;
  publisher: string | null;
  publication_date: string | null;
  url: string | null;
  description: string | null;
  co_author_user_ids: string[];
  co_authors_text: string[];
  cover_image_url: string | null;
  position_order: number;
  created_at: string;
};

export type ProfileVolunteer = {
  id: string;
  user_id: string;
  organization: string;
  cause: string | null;
  role: string;
  start_month: string;
  end_month: string | null;
  is_current: boolean;
  description: string | null;
  position_order: number;
  created_at: string;
};

export type ProfileAward = {
  id: string;
  user_id: string;
  title: string;
  issuer: string | null;
  issued_date: string | null;
  description: string | null;
  url: string | null;
  position_order: number;
  created_at: string;
};

export type OpenToWorkStartDatePreference =
  | "immediately"
  | "within_1_month"
  | "within_3_months"
  | "flexible";

export type OpenToWorkVisibility =
  | "all_members"
  | "recruiters_only"
  | "hidden";

export type ProfileOpenToWork = {
  user_id: string;
  job_titles: string[];
  locations: string[];
  work_types: string[];
  industries: string[];
  start_date_preference: OpenToWorkStartDatePreference | null;
  visibility: OpenToWorkVisibility;
  note: string | null;
  updated_at: string;
};

/* Follows asymétriques + close friends (migration 0067). */
export type UserFollow = {
  follower_id: string;
  followed_id: string;
  created_at: string;
};

export type CloseFriend = {
  user_id: string;
  close_friend_id: string;
  created_at: string;
};

export type MutualFollower = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

/* User badges (migration 0068). */
export type UserBadgeType =
  | "founder"
  | "beta_tester"
  | "top_creator"
  | "event"
  | "achievement"
  | "mentor_certified"
  | "employee_verified"
  | "identity_verified"
  | "press"
  | "super_seller";

export type UserBadge = {
  id: string;
  user_id: string;
  badge_type: UserBadgeType;
  label: string;
  description: string | null;
  icon: string | null;
  accent_color: string | null;
  metadata: Record<string, unknown>;
  awarded_at: string;
  expires_at: string | null;
  is_visible: boolean;
};

/* Facette Créateur (migration 0069). */
export type CreatorAudienceAge =
  | "13-17"
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65+";

export type CreatorStats = {
  user_id: string;
  total_views: number;
  total_likes: number;
  avg_engagement_rate: number;
  monthly_active_followers: number;
  primary_audience_age: CreatorAudienceAge | null;
  primary_audience_geo: string[];
  content_categories: string[];
  updated_at: string;
};

export type CreatorFeaturedContentType =
  | "post"
  | "reel"
  | "story_highlight"
  | "external";

export type CreatorFeatured = {
  id: string;
  user_id: string;
  content_type: CreatorFeaturedContentType;
  post_id: string | null;
  reel_id: string | null;
  story_highlight_id: string | null;
  external_url: string | null;
  external_title: string | null;
  external_thumbnail_url: string | null;
  sort_position: number;
  created_at: string;
};

export type CreatorCollaborationType =
  | "sponsorship"
  | "partnership"
  | "ambassador"
  | "affiliate"
  | "placement"
  | "review"
  | "event"
  | "other";

export type CreatorCollaboration = {
  id: string;
  user_id: string;
  brand_name: string;
  brand_company_id: string | null;
  brand_logo_url: string | null;
  collaboration_type: CreatorCollaborationType | null;
  start_month: string | null;
  end_month: string | null;
  is_ongoing: boolean;
  description: string | null;
  sort_position: number;
  created_at: string;
};

export type CreatorMediaKit = {
  user_id: string;
  is_open_to_partnerships: boolean;
  rate_post_amount: number | null;
  rate_reel_amount: number | null;
  rate_story_amount: number | null;
  rate_currency:
    | "EUR" | "USD" | "XAF" | "XOF" | "MAD" | "TND" | "DZD" | "CAD" | "CHF" | "GBP"
    | null;
  contact_email: string | null;
  booking_url: string | null;
  media_kit_pdf_url: string | null;
  notes: string | null;
  updated_at: string;
};

/* Facette Entrepreneur (migration 0070). */
export type EntrepreneurFounderStatus =
  | "founder"
  | "co_founder"
  | "ceo"
  | "cto"
  | "cfo"
  | "coo"
  | "president"
  | "managing_director"
  | "board_member"
  | "advisor"
  | "other";

export type EntrepreneurCompanyStage =
  | "idea"
  | "mvp"
  | "seed"
  | "series_a"
  | "series_b"
  | "series_c_plus"
  | "profitable"
  | "acquired"
  | "shutdown"
  | "ipo";

export type EntrepreneurRound =
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b"
  | "series_c"
  | "series_d_plus"
  | "bridge"
  | "crowdfunding"
  | "angel"
  | "other";

export type EntrepreneurCurrency =
  | "EUR"
  | "USD"
  | "XAF"
  | "XOF"
  | "MAD"
  | "TND"
  | "DZD"
  | "CAD"
  | "CHF"
  | "GBP";

export type EntrepreneurCompany = {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  company_logo_url: string | null;
  role: string;
  founder_status: EntrepreneurFounderStatus;
  founded_year: number | null;
  exit_year: number | null;
  is_current: boolean;
  description: string | null;
  industry: string | null;
  company_stage: EntrepreneurCompanyStage | null;
  sort_position: number;
  created_at: string;
};

export type EntrepreneurInvestment = {
  id: string;
  user_id: string;
  invested_company_id: string | null;
  company_name: string;
  company_logo_url: string | null;
  round: EntrepreneurRound | null;
  amount: number | null;
  currency: EntrepreneurCurrency | null;
  is_amount_public: boolean;
  invested_at: string | null;
  exit_at: string | null;
  description: string | null;
  sort_position: number;
  created_at: string;
};

export type EntrepreneurFundraisingStatus = {
  user_id: string;
  is_open: boolean;
  round_type: Exclude<EntrepreneurRound, "angel"> | null;
  target_amount: number | null;
  raised_amount: number | null;
  currency: EntrepreneurCurrency | null;
  pitch_deck_url: string | null;
  contact_email: string | null;
  closing_date: string | null;
  notes: string | null;
  updated_at: string;
};

/* Identity verification requests (migration 0071). */
export type IdentityVerificationStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "expired";

export type IdentityVerificationType =
  | "identity"
  | "press"
  | "professional"
  | "business";

export type IdentityVerificationRequest = {
  id: string;
  user_id: string;
  status: IdentityVerificationStatus;
  verification_type: IdentityVerificationType;
  document_id_url: string | null;
  document_selfie_url: string | null;
  applicant_notes: string | null;
  reviewer_notes: string | null;
  reviewer_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
};

/* Brouillon édition profil (migration 0070). */
export type DraftProfile = {
  user_id: string;
  payload: Record<string, unknown>;
  current_section: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type CircleColor =
  | "gold"
  | "navy"
  | "emerald"
  | "rose"
  | "violet"
  | "cream";

/* Migration 0091 — accès granulaire (remplace is_private legacy). */
export type CircleType = "open" | "semi_open" | "private" | "hidden";
export type CircleJoinPolicy =
  | "instant"
  | "request"
  | "invite_only"
  | "paid"
  | "quiz";
export type CircleVisibility = "public" | "unlisted" | "invite_only";

/* Modules activables par le créateur (modules JSONB sur circles). */
export type CircleModules = {
  social_feed: boolean;
  marketplace: boolean;
  jobs: boolean;
  library: boolean;
  events: boolean;
  live_audio: boolean;
  polls: boolean;
  wiki: boolean;
  challenges: boolean;
  mentorship: boolean;
};

/* Migration 0092 — rôles étendus. 'mod' est conservé comme alias legacy
 * de 'moderator' (rows existantes). Le mapping côté code unifie. */
export type CircleRole =
  | "owner"
  | "admin"
  | "moderator"
  | "mod"
  | "ambassador"
  | "contributor"
  | "member";

export type CircleMembershipStatus =
  | "active"
  | "pending_approval"
  | "pending_invite"
  | "left"
  | "banned";

/* Préférences notifications par cercle (jsonb sur circle_members). */
export type CircleNotificationPreferences = {
  new_posts: "all" | "highlights" | "mentions_only" | "off";
  new_marketplace: "all" | "matching_interests" | "off";
  new_jobs: "all" | "matching_profile" | "off";
  new_events: "all" | "rsvp_only" | "off";
  mentions: boolean;
  direct_replies: boolean;
  moderator_messages: boolean;
  weekly_digest: boolean;
};

/* Configuration monétisation (jsonb sur circles, V2). */
export type CircleMonetization = {
  is_paid: boolean;
  pricing_model: "free" | "one_time" | "subscription_monthly" | "subscription_yearly";
  price_amount: number | null;
  currency: string;
  free_trial_days: number;
  revenue_split_creator: number; // 0.85 par défaut
  revenue_split_divarc: number; // 0.15 par défaut
};

export type Circle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: CircleColor | null;
  is_private: boolean;
  owner_id: string;
  members_count: number;
  created_at: string;
  /* Migration 0091 — identité étendue. */
  tagline: string | null;
  cover_url: string | null;
  cover_video_url: string | null;
  color_accent: string;
  /* Catégorisation. */
  primary_category: string | null;
  secondary_categories: string[];
  tags: string[];
  language: string;
  /* Localisation. */
  is_local: boolean;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_km: number | null;
  /* Accès. */
  type: CircleType;
  join_policy: CircleJoinPolicy;
  visibility: CircleVisibility;
  /* Modules. */
  modules: CircleModules;
  /* Bienvenue. */
  welcome_message: string | null;
  /* Stats counters. */
  active_members_count_7d: number;
  posts_count_total: number;
  posts_count_7d: number;
  new_members_count_7d: number;
  new_members_count_30d: number;
  engagement_rate: number;
  vitality_score: number;
  /* Monétisation. */
  monetization: CircleMonetization | null;
  /* Lifecycle. */
  archived_at: string | null;
  updated_at: string;
};

export type CircleMember = {
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
  /* Migration 0092 — extensions. */
  status: CircleMembershipStatus;
  last_active_at: string;
  posts_count: number;
  comments_count: number;
  reactions_given_count: number;
  nickname: string | null;
  badge: string | null;
  custom_role_color: string | null;
  notifications: CircleNotificationPreferences;
  subscription_status: "active" | "cancelled" | "expired" | null;
  subscription_started_at: string | null;
  subscription_renews_at: string | null;
  is_muted: boolean;
  muted_until: string | null;
  warnings_count: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  /* Migration 0103 — onboarding modal vu/dismissé. */
  onboarding_completed_at: string | null;
};

export type CircleWithMembership = Circle & {
  is_member: boolean;
  my_role: CircleRole | null;
};

/* Migration 0093 — règles affichées dans l'onglet À propos. */
export type CircleRule = {
  id: string;
  circle_id: string;
  position: number;
  title: string;
  description: string | null;
  icon: string | null;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
};

/* Migration 0093 — flairs (tags configurables par cercle pour les posts). */
export type CircleFlair = {
  id: string;
  circle_id: string;
  slug: string;
  label: string;
  color: string;
  position: number;
  created_at: string;
};

/* Migration 0093 — votes sur posts de cercle. */
export type CirclePostVoteType = "upvote" | "downvote" | "helpful";
export type CirclePostVote = {
  user_id: string;
  post_id: string;
  vote_type: CirclePostVoteType;
  created_at: string;
};

/* Migration 0108 — Module Mentorat. */
export type CircleMentorOffer = {
  id: string;
  circle_id: string;
  mentor_user_id: string;
  headline: string;
  bio: string | null;
  expertise: string[];
  availability: string | null;
  capacity: number | null;
  current_mentees: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
};

/* Chantier 5.4 (migration 0104) — système d'ambassadeurs. */
export type CircleAmbassadorBadge =
  | "connector"
  | "ambassador"
  | "champion"
  | "cofounder";

export type CircleAmbassadorReward = {
  user_id: string;
  circle_id: string;
  invitations_sent: number;
  invitations_accepted: number;
  badges: Record<CircleAmbassadorBadge, string | null>;
  current_level: number;
  created_at: string;
  updated_at: string;
};

/* Chantier 4.5 (migration 0102) — règles AutoMod par cercle. */
export type CircleAutomodRuleType =
  | "slow_mode"
  | "word_filter"
  | "report_threshold"
  | "link_filter";

export type CircleAutomodAction = "flag" | "hide" | "require_approval";

export type CircleAutomodRule = {
  id: string;
  circle_id: string;
  created_by: string;
  rule_type: CircleAutomodRuleType;
  config: Record<string, unknown>;
  on_match_action: CircleAutomodAction;
  enabled: boolean;
  match_count: number;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
};

/* Chantier 4.4 (migration 0101) — sanctions progressives par cercle. */
export type CircleSanctionAction =
  | "warning"
  | "mute_1h"
  | "mute_24h"
  | "mute_7d"
  | "temp_ban_30d"
  | "permanent_ban";

export type CircleSanction = {
  id: string;
  circle_id: string;
  target_user_id: string;
  issued_by: string | null;
  level: number;
  action: CircleSanctionAction;
  reason: string | null;
  issued_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
  lifted_reason: string | null;
};

/* Chantier 4.3 (migration 0100) — audit log modération par cercle. */
export type CircleModerationActionType =
  | "post_approved"
  | "post_rejected"
  | "post_pinned"
  | "post_unpinned"
  | "post_locked"
  | "post_unlocked"
  | "post_announcement_set"
  | "post_announcement_unset"
  | "member_promoted"
  | "member_demoted"
  | "member_warned"
  | "member_muted"
  | "member_unmuted"
  | "member_banned"
  | "member_unbanned"
  | "rule_added"
  | "rule_removed"
  | "rule_updated"
  | "flair_added"
  | "flair_removed";

export type CircleModerationAction = {
  id: string;
  circle_id: string;
  actor_user_id: string;
  action_type: CircleModerationActionType;
  target_post_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  reason: string | null;
  created_at: string;
};

/* Chantier 3.5 (migration 0098) — bibliothèque collaborative par cercle. */
export type CircleLibraryItemType =
  | "document"
  | "video"
  | "article"
  | "link"
  | "template"
  | "wiki";

export type CircleLibraryCategory = {
  id: string;
  circle_id: string;
  label: string;
  description: string | null;
  position: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type CircleLibraryItem = {
  id: string;
  circle_id: string;
  category_id: string | null;
  created_by: string;
  type: CircleLibraryItemType;
  title: string;
  description: string | null;
  content_url: string | null;
  body: string | null;
  tags: string[];
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  views_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
};

export type CircleMemberWithProfile = CircleMember & {
  profile: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

export type CircleEventCategory = "community" | "social" | "cultural";

/* Chantier 3.6 (migration 0099) — RSVP étendu + types event. */
export type CircleEventAttendanceStatus =
  | "going"
  | "interested"
  | "maybe"
  | "not_going";

export type CircleEventType = "in_person" | "online" | "hybrid";
export type CircleEventLifecycle =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

export type CircleEvent = {
  id: string;
  circle_id: string;
  author_id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: CircleEventCategory;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  attendance_count: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
  reminded_24h_at: string | null;
  reminded_1h_at: string | null;
  /* Chantier 3.6 (migration 0099). */
  event_type: CircleEventType;
  online_url: string | null;
  online_platform: string | null;
  timezone: string;
  cover_image_url: string | null;
  status: CircleEventLifecycle;
  require_approval: boolean;
  is_paid: boolean;
  price_amount: number | null;
  price_currency: string | null;
  co_host_user_ids: string[];
};

export type CircleEventAttendance = {
  event_id: string;
  user_id: string;
  status: CircleEventAttendanceStatus;
  responded_at: string;
};

export type CircleEventWithRsvp = CircleEvent & {
  my_status: CircleEventAttendanceStatus | null;
};

export type CircleInvitation = {
  id: string;
  circle_id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type CircleInvitationPreview = {
  circle_id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: CircleColor | null;
  is_private: boolean;
  members_count: number;
  invitation_id: string;
  expires_at: string | null;
};

/* Status étendu Chantier 1.1 — ajout pending_review, paused, reserved,
   expired, removed_violation, removed_user (compat avec valeurs legacy). */
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "reserved"
  | "sold"
  | "expired"
  | "archived"
  | "removed_violation"
  | "removed_user";

/* Condition étendue Chantier 1.1 — accepte les anciennes valeurs FR
   (new/like_new/used/fair) ET les nouvelles Vinted-style. */
export type ListingCondition =
  | "new"
  | "like_new"
  | "used"
  | "fair"
  | "new_with_tags"
  | "new_without_tags"
  | "very_good"
  | "good"
  | "satisfactory"
  | "damaged";

/* Catégorie legacy (texte libre) — V1.1 introduira la taxonomie complète
   via lib/marketplace/taxonomy.ts. Pour V1 on garde les valeurs FR
   actuelles pour la compat des rows existantes. */
export type ListingCategory =
  | "mode"
  | "mobilier"
  | "electronique"
  | "vehicules"
  | "livres"
  | "sport"
  | "musique"
  | "enfants"
  | "jardinage"
  | "alimentation"
  | "artisanat"
  | "services"
  | "autre";

export type ListingType =
  | "goods"
  | "service"
  | "real_estate"
  | "vehicle"
  | "event_ticket"
  | "digital"
  | "job"
  | "housing_rental";

export type ListingModerationStatus =
  | "approved"
  | "pending"
  | "flagged"
  | "rejected";

export type ListingBoostType = "standard" | "premium" | "top";

/* Option de livraison stockée en JSONB côté DB. */
export type ListingShippingOption = {
  type:
    | "pickup_in_person"
    | "mondial_relay"
    | "colissimo"
    | "chronopost"
    | "international_standard"
    | "international_express"
    | "custom";
  price: number;
  estimated_days_min: number;
  estimated_days_max: number;
  carrier?: string | null;
  requires_signature?: boolean;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_amount: number;
  price_currency: Currency;
  category: ListingCategory;
  condition: ListingCondition;
  location: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  /* Chantier 1.1 — extensions schéma v2 (migration 0083). */
  listing_type: ListingType;
  category_path: string[];
  primary_category: string | null;
  attributes: Record<string, unknown>;
  original_price: number | null;
  is_negotiable: boolean;
  minimum_offer: number | null;
  location_lat: number | null;
  location_lng: number | null;
  show_exact_location: boolean;
  shipping_options: ListingShippingOption[];
  accepts_pickup: boolean;
  pickup_locations: Array<Record<string, unknown>>;
  quantity_available: number;
  is_made_to_order: boolean;
  handmade: boolean;
  extended_data: Record<string, unknown> | null;
  views_count: number;
  favorites_count_cached: number;
  shares_count: number;
  messages_count: number;
  is_boosted: boolean;
  boost_expires_at: string | null;
  boost_type: ListingBoostType | null;
  moderation_status: ListingModerationStatus;
  moderation_flags: string[];
  seo_slug: string | null;
  published_at: string | null;
  expires_at: string | null;
  sold_to: string | null;
  sold_price: number | null;
  seller_response_rate: number | null;
  /* Chantier 3.3 — rattachement optionnel à un cercle (migration 0096). */
  circle_id: string | null;
};

export type ListingPhoto = {
  id: string;
  listing_id: string;
  url: string;
  position: number;
  created_at: string;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
  /* Chantier 1.1 — extension (migration 0083). */
  is_primary: boolean;
  blurhash: string | null;
  ai_tags: string[];
  has_nsfw_content: boolean;
};

export type Favorite = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type ListingOfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "expired"
  | "withdrawn";

export type ListingOffer = {
  id: string;
  listing_id: string;
  from_user: string;
  to_user: string;
  parent_offer_id: string | null;
  amount: number;
  currency: Currency;
  message: string | null;
  status: ListingOfferStatus;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
};

export type ListingOfferWithCounterparty = ListingOffer & {
  counterparty: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  listing: Pick<Listing, "id" | "title" | "price_amount" | "price_currency" | "status"> | null;
};

export type ContentEmbedding = {
  post_id: string;
  /* pgvector serializes vector(1536) as a string in the wire format
     (e.g. "[0.12,0.34,...]"). On garde un type number[] pour usage code
     applicatif et le client Supabase fait la conversion automatique. */
  embedding: number[];
  model: string;
  source_text: string | null;
  generated_at: string;
};

/* Chantier Reels Recsys étape 4 — embeddings dédiés reels (migration 0118). */
export type ReelEmbedding = {
  reel_id: string;
  embedding: number[];
  model: string;
  source_text: string | null;
  generated_at: string;
};

export type EventSurface =
  | "feed_home"
  | "feed_circle"
  | "reels"
  | "reels_foryou"
  | "reels_following"
  | "discover"
  | "marketplace"
  | "jobs"
  | "profile"
  | "search"
  | "notif"
  | "story"
  | "message";

export type RecsysEvent = {
  event_id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  surface: EventSurface | null;
  position: number | null;
  target_post_id: string | null;
  target_user_id: string | null;
  target_listing_id: string | null;
  target_job_id: string | null;
  target_circle_id: string | null;
  properties: Record<string, unknown>;
  device_type: "mobile" | "tablet" | "desktop" | null;
  locale: string | null;
  client_ts: number | null;
  created_at: string;
};

export type UserInterestProfile = {
  user_id: string;
  interest_vector: number[] | null;
  topic_affinity: Record<string, number>;
  user_affinity: Record<string, number>;
  circle_affinity: Record<string, number>;
  behavioral_features: Record<string, unknown>;
  format_preference: Record<string, number>;
  active_hours_distribution: Record<string, number>;
  events_processed_count: number;
  profile_version: number;
  last_updated: string;
};

export type UserAlgorithmSettings = {
  user_id: string;
  chronological_mode: boolean;
  personalization_consent: boolean;
  location_consent: boolean;
  contacts_consent: boolean;
  ads_consent: boolean;
  consent_timestamp: string | null;
  hidden_topics: string[];
  hidden_users: string[];
  manual_topics: string[];
  /* Chantier Feed v2.6 — garde-fous Feed v2 (migration 0117). */
  anti_doomscroll_enabled: boolean;
  author_diversity_enabled: boolean;
  signal_filter_enabled: boolean;
  default_feed_mode: FeedMode;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_success_at: string | null;
};

export type PayoutRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export type PayoutRequest = {
  id: string;
  user_id: string;
  amount: number;
  currency: Currency;
  iban: string;
  bic: string | null;
  account_holder: string;
  status: PayoutRequestStatus;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

/* ============================================================================
 * MARKETPLACE — Orders (Chantier 1.4, migration 0084)
 * ============================================================================ */

export type OrderStatus =
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "awaiting_shipment"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded"
  | "partially_refunded";

export type ShippingMethod =
  | "pickup_in_person"
  | "mondial_relay"
  | "colissimo"
  | "chronopost"
  | "international_standard"
  | "international_express"
  | "custom";

export type Order = {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_snapshot: Record<string, unknown>;
  status: OrderStatus;
  /* Montants en EUR (ou autre currency). */
  item_price: number;
  shipping_price: number;
  service_fee: number;
  buyer_protection_fee: number;
  total_amount: number;
  seller_amount: number;
  divarc_commission: number;
  currency: Currency;
  /* Paiement Stripe Connect. */
  payment_intent_id: string | null;
  payment_method_type: string | null;
  paid_at: string | null;
  /* Escrow. */
  funds_held_in_escrow: boolean;
  escrow_released_at: string | null;
  /* Délais. */
  payment_deadline: string | null;
  shipping_deadline: string | null;
  delivery_deadline: string | null;
  confirmation_deadline: string | null;
  /* Documents. */
  invoice_url: string | null;
  /* Reviews (FK croisée — créées en Chantier 6). */
  buyer_review_id: string | null;
  seller_review_id: string | null;
  /* Litige (FK ajoutée en Chantier 6). */
  dispute_id: string | null;
  is_disputed: boolean;
  /* Timestamps. */
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type OrderStatusChange = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
};

export type OrderAddress = {
  full_name: string;
  street_line_1: string;
  street_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
};

export type OrderPickupPoint = {
  id: string;
  carrier: string;
  name: string;
  address: OrderAddress;
  opening_hours?: string;
  distance_m?: number;
};

export type OrderShippingDetails = {
  id: string;
  order_id: string;
  method: ShippingMethod;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  from_address: OrderAddress | null;
  to_address: OrderAddress | null;
  pickup_point: OrderPickupPoint | null;
  label_url: string | null;
  label_purchased_at: string | null;
  label_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type OrderTrackingEvent = {
  id: string;
  order_id: string;
  event_type: string;
  event_at: string;
  location: string | null;
  description: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

/* ============================================================================
 * MARKETPLACE — Reviews & Disputes (Chantier 6, migration 0088)
 * ============================================================================ */

export type MarketplaceReview = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: "buyer" | "seller";
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
};

export type DisputeReason =
  | "item_not_received"
  | "item_not_as_described"
  | "item_damaged"
  | "counterfeit"
  | "buyer_no_payment"
  | "buyer_abusive"
  | "other";

export type DisputeStatus =
  | "open"
  | "awaiting_response"
  | "in_review"
  | "resolved_buyer"
  | "resolved_seller"
  | "resolved_split"
  | "escalated_to_stripe"
  | "cancelled";

export type MarketplaceDispute = {
  id: string;
  order_id: string;
  opened_by: string;
  opened_by_role: "buyer" | "seller";
  reason: DisputeReason;
  body: string | null;
  status: DisputeStatus;
  responder_body: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type Dac7YearlyRevenue = {
  seller_id: string;
  year: number;
  total_orders: number;
  total_revenue_eur: number;
  has_dac7_threshold: boolean;
};

export type ListingWithDetails = Listing & {
  photos: ListingPhoto[];
  seller: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "location"> | null;
  is_favorited: boolean;
  favorites_count: number;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_user_id: string | null;
  related_conversation_id: string | null;
  related_friendship_id: string | null;
  related_post_id: string | null;
  related_reel_id: string | null;
  related_reel_comment_id: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

/* V3.5 — user_notification_preferences (migration 0057). 1 row par user,
   opt-out granulaire par catégorie. */
export type UserNotificationPreferences = {
  user_id: string;
  friend_requests: boolean;
  messages: boolean;
  mentions: boolean;
  likes: boolean;
  comments: boolean;
  moderation: boolean;
  system: boolean;
  updated_at: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendshipStatus;
  intro_message: string | null;
  created_at: string;
  responded_at: string | null;
};

/** Friendship enriched with the *other* user's profile for UI rendering */
export type FriendshipWithProfile = Friendship & {
  other: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "location">;
  direction: "incoming" | "outgoing";
};

export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  last_message_at: string;
  /* Étendu Chantier 1 (migration 0073). */
  description: string | null;
  cover_url: string | null;
  last_message_id: string | null;
  /* Préparation Chantier 4 — Liens DIVARC (alimenté plus tard). */
  link_level: number;
  link_xp: number;
  link_streak_days: number;
  last_meaningful_exchange_at: string | null;
  /* Disparition auto au niveau de la conv (Éclats globaux). */
  auto_delete_after_days: 1 | 7 | 30 | null;
  /* Migration 0089 — lien vers listing si type='listing_chat'. */
  listing_id: string | null;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  role: MemberRole;
  /* Étendu Chantier 1 (migration 0073). */
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  mute_until: string | null;
  nickname: string | null;
  custom_color: string | null;
  can_send_media: boolean;
  /* Toggle "Conversation secrète" (E2E Signal Protocol opt-in). */
  wants_secret: boolean;
  /* Chantier 3 : thème personnalisé par-membre (migration 0077). */
  theme_preset: string | null;
  wallpaper_id: string | null;
};

export type AttachmentType = "image" | "audio" | "video" | "file";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  type: MessageType;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_width: number | null;
  attachment_height: number | null;
  attachment_duration_ms: number | null;
  reply_to_message_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  /* Étendu Chantier 1 (migration 0073). */
  /* Chiffrement E2E opt-in (Conversations secrètes). */
  is_secret: boolean;
  /* Encoded en base64 côté DB jsonb (bytea retourné par Supabase). */
  encrypted_content: string | null;
  encryption_metadata: Record<string, unknown> | null;
  /* Disparition auto / view_once. */
  view_once: boolean;
  view_once_viewed_at: string | null;
  view_once_viewer_id: string | null;
  expires_at: string | null;
  screenshot_detected: boolean;
  /* Forwarding. */
  forwarded_from_message_id: string | null;
  forwarded_from_user_id: string | null;
  forward_count: number;
  /* Threading 3 niveaux. */
  thread_root_id: string | null;
  /* Delivery status map. */
  delivery_status: MessageDeliveryStatusMap;
  /* Pin/star. */
  is_pinned_in_conv: boolean;
  starred_by_user_ids: string[];
};

export type MessageReaction = {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  user_reacted: boolean;
};

export type MessageReplyContext = {
  id: string;
  sender_id: string;
  sender_name: string | null;
  body: string | null;
  attachment_type: AttachmentType | null;
};

/** Aggregated view used in the conversation list — one row per conversation */
export type ConversationListItem = {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  last_message_at: string;
  last_read_at: string;
  unread_count: number;
  /* Chantier 1.3 — flags par-membre (migration 0073). */
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  mute_until: string | null;
  wants_secret: boolean;
  other_member: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  last_message: {
    body: string | null;
    sender_id: string;
    created_at: string;
    attachment_type: AttachmentType | null;
    is_secret: boolean;
  } | null;
};

/* ========================================================================
 * Trust & Safety / Modération (migrations 0046 + 0047)
 * ======================================================================== */

export type ModerationTargetType =
  | "post"
  | "comment"
  | "user"
  | "message"
  | "listing"
  | "story"
  | "job"
  | "listing_offer";

export type ModerationCategory =
  | "hate_speech"
  | "harassment"
  | "violence"
  | "nudity_sexual"
  | "child_safety"
  | "self_harm"
  | "spam"
  | "scam_fraud"
  | "impersonation"
  | "intellectual_property"
  | "privacy"
  | "illegal_activity"
  | "other";

export type ModerationReportStatus =
  | "pending"
  | "triaging"
  | "under_review"
  | "actioned"
  | "dismissed"
  | "duplicate";

export type ModerationActionType =
  | "no_action"
  | "warn"
  | "hide"
  | "delete"
  | "restrict_24h"
  | "restrict_7d"
  | "restrict_30d"
  | "suspend"
  | "ban_permanent"
  | "escalate"
  | "authority_report";

export type ModerationAppealStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "rejected"
  | "escalated_external";

export type SanctionType = "warning" | "readonly" | "suspended" | "banned";

export type ModerationReport = {
  id: string;
  reporter_id: string;
  target_type: ModerationTargetType;
  target_post_id: string | null;
  target_comment_id: string | null;
  target_user_id: string | null;
  target_message_id: string | null;
  target_listing_id: string | null;
  target_story_id: string | null;
  target_job_id: string | null;
  category: ModerationCategory;
  subcategory: string | null;
  description: string | null;
  evidence_urls: string[];
  reporter_ip: string | null;
  reporter_user_agent: string | null;
  status: ModerationReportStatus;
  priority_score: number;
  assigned_moderator_id: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  resolution_action_id: string | null;
  created_at: string;
};

export type ModerationAction = {
  id: string;
  moderator_id: string | null;
  is_automated: boolean;
  target_type: ModerationTargetType;
  target_post_id: string | null;
  target_comment_id: string | null;
  target_user_id: string | null;
  target_message_id: string | null;
  target_listing_id: string | null;
  target_story_id: string | null;
  target_job_id: string | null;
  action: ModerationActionType;
  category: ModerationCategory;
  reason_internal: string | null;
  reason_user: string;
  legal_basis: string | null;
  content_snapshot: Record<string, unknown>;
  ml_scores: Record<string, unknown> | null;
  reports_referenced: string[];
  appealable: boolean;
  appeal_deadline: string | null;
  created_at: string;
};

export type ModerationAppeal = {
  id: string;
  action_id: string;
  appellant_id: string;
  user_explanation: string;
  additional_evidence_urls: string[];
  status: ModerationAppealStatus;
  assigned_moderator_id: string | null;
  resolution_note: string | null;
  resolution_action_id: string | null;
  resolved_at: string | null;
  sla_deadline: string;
  created_at: string;
};

export type UserSanction = {
  id: string;
  user_id: string;
  level: number;
  type: SanctionType;
  reason: string;
  source_action_id: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  lifted_at: string | null;
  lifted_reason: string | null;
  created_at: string;
};

export type TrustedFlagger = {
  id: string;
  user_id: string | null;
  organization_name: string | null;
  contact_email: string;
  expertise_categories: string[];
  awarded_by: string | null;
  awarded_at: string | null;
  is_active: boolean;
  reports_submitted: number;
  reports_actioned: number;
  precision_rate: number | null;
  created_at: string;
};

export type ModerationQueueJobType =
  | "preflight_text"
  | "preflight_image"
  | "deep_scan"
  | "behavioral_check"
  | "csam_scan"
  | "review_handoff"
  | "appeal_handoff";

export type ModerationQueueItem = {
  id: string;
  job_type: ModerationQueueJobType;
  payload: Record<string, unknown>;
  priority: number;
  status: "queued" | "running" | "done" | "failed" | "dead_letter";
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  picked_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
};

export type ModerationKnownHash = {
  id: string;
  hash: string;
  hash_type: "sha256" | "phash" | "blockhash" | "photodna";
  category: string;
  source_action_id: string | null;
  added_by: string | null;
  created_at: string;
  is_active: boolean;
};

export type ModerationTextCacheRow = {
  text_hash: string;
  scan_result: Record<string, unknown>;
  detected_categories: string[];
  highest_score: number;
  scanned_at: string;
};

export type ModerationImageCacheRow = {
  image_hash: string;
  phash: string | null;
  scan_result: Record<string, unknown>;
  nsfw_score: number | null;
  violence_score: number | null;
  csam_match: boolean;
  scanned_at: string;
};

export type ModerationCriticalIncident = {
  id: string;
  incident_type: "csam" | "terrorism" | "imminent_violence" | "revenge_porn";
  evidence_storage_path: string;
  evidence_metadata: Record<string, unknown>;
  perpetrator_user_id: string | null;
  perpetrator_email: string | null;
  perpetrator_ip: string | null;
  ncmec_submitted_at: string | null;
  ncmec_report_id: string | null;
  pharos_submitted_at: string | null;
  pharos_reference: string | null;
  detected_by: "photodna" | "user_report" | "moderator" | "external_api";
  status: "detected" | "authorities_notified" | "closed";
  closed_at: string | null;
  created_at: string;
};

export type LegalDataRequest = {
  id: string;
  request_type:
    | "judicial"
    | "administrative"
    | "dpa"
    | "court_order"
    | "urgent_life_at_risk";
  authority_name: string;
  authority_reference: string | null;
  contact_email: string;
  target_user_id: string | null;
  target_scope: string;
  scope_details: Record<string, unknown> | null;
  sla_deadline: string;
  legal_basis: string;
  received_at: string;
  acknowledged_at: string | null;
  responded_at: string | null;
  response_payload_path: string | null;
  handled_by: string | null;
  status: "received" | "validated" | "responded" | "rejected" | "withdrawn";
  rejection_reason: string | null;
  created_at: string;
};

/* ========================================================================
 * Régie publicitaire / Ads Manager (migration 0048)
 * ======================================================================== */

export type AdsBusinessAccount = {
  id: string;
  legal_name: string;
  legal_form: string | null;
  siret: string | null;
  vat_number: string | null;
  billing_address: Record<string, unknown>;
  primary_contact_user_id: string;
  primary_contact_email: string;
  primary_contact_phone: string | null;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  verification_documents: Record<string, unknown>[];
  verification_notes: string | null;
  verified_at: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

export type AdAccount = {
  id: string;
  business_account_id: string;
  name: string;
  currency: "EUR" | "USD" | "GBP" | "CAD" | "CHF";
  timezone: string;
  spend_limit_daily: number | null;
  spend_limit_monthly: number | null;
  prepaid_balance: number;
  total_spent: number;
  status: "active" | "paused" | "suspended" | "closed";
  suspension_reason: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

export type AdAccountUser = {
  ad_account_id: string;
  user_id: string;
  role: "admin" | "editor" | "analyst" | "finance";
  granted_by: string | null;
  granted_at: string;
};

export type AdvertiserEntity = {
  id: string;
  ad_account_id: string;
  type: "divarc_company" | "external_site" | "mobile_app" | "physical_store";
  name: string;
  url: string | null;
  logo_url: string | null;
  divarc_company_id: string | null;
  verified_owner: boolean;
  verification_method: string | null;
  verified_at: string | null;
  created_at: string;
};

export type AdsAudience = {
  id: string;
  ad_account_id: string;
  name: string;
  type:
    | "saved"
    | "custom_list"
    | "custom_pixel"
    | "custom_engagement"
    | "lookalike"
    | "divarc_special";
  targeting_spec: Record<string, unknown> | null;
  custom_list_count: number | null;
  custom_match_count: number | null;
  custom_match_rate: number | null;
  lookalike_source_id: string | null;
  lookalike_countries: string[] | null;
  lookalike_size_pct: number | null;
  divarc_special_config: Record<string, unknown> | null;
  estimated_size: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdsAudienceMember = {
  audience_id: string;
  identifier_hash: string;
  identifier_type: "email" | "phone" | "external_id";
  matched_user_id: string | null;
  uploaded_at: string;
};

export type AdsCampaign = {
  id: string;
  ad_account_id: string;
  name: string;
  objective: string;
  status:
    | "draft"
    | "pending_review"
    | "active"
    | "paused"
    | "completed"
    | "rejected";
  buying_type: "auction" | "reservation";
  daily_budget: number | null;
  lifetime_budget: number | null;
  spend_cap: number | null;
  start_time: string | null;
  end_time: string | null;
  is_split_test: boolean;
  split_test_variant_ids: string[];
  special_ad_category: "housing" | "employment" | "credit" | "social" | null;
  compliance_review_status: "pending" | "approved" | "rejected" | "holding";
  compliance_notes: string | null;
  /* V4 — Smart Campaign + attribution + target ROAS. */
  attribution_setting:
    | "last_click_7d"
    | "last_click_1d"
    | "linear_7d"
    | "linear_28d"
    | "position_based_7d"
    | "time_decay_7d"
    | "data_driven"
    | "view_through_1d"
    | null;
  target_roas: number | null;
  is_smart_campaign: boolean;
  website_analysis_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdsAdSet = {
  id: string;
  campaign_id: string;
  ad_account_id: string;
  name: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  bid_strategy:
    | "lowest_cost"
    | "cost_cap"
    | "bid_cap"
    | "target_cost"
    | "target_roas"
    | "minimum_roas";
  bid_amount: number | null;
  targeting: Record<string, unknown>;
  placements: string[];
  optimization_goal: string;
  billing_event: "impressions" | "clicks" | "video_views" | "app_installs" | "conversions";
  pacing_type: "standard" | "no_pacing";
  frequency_cap: Record<string, unknown> | null;
  start_time: string | null;
  end_time: string | null;
  dayparting: Record<string, unknown> | null;
  status: "active" | "paused" | "archived";
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  /* V4 — attribution windows + cost caps + audience riche. */
  attribution_window_click_days: 1 | 7 | 28 | null;
  attribution_window_view_days: 1 | 7 | null;
  budget_optimization_mode: "cbo" | "abo" | null;
  cost_cap: number | null;
  bid_cap: number | null;
  minimum_roas: number | null;
  delivery_type: "standard" | "accelerated" | null;
  audience_behaviors: Record<string, unknown>;
  audience_connections: Record<string, unknown>;
  audience_locations_advanced: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdsCreative = {
  id: string;
  ad_account_id: string;
  type:
    | "single_image"
    | "single_video"
    | "carousel"
    | "collection"
    | "instant_experience";
  media_url: string | null;
  media_thumbnail_url: string | null;
  carousel_cards: Record<string, unknown>[];
  primary_text: string;
  headline: string;
  description: string | null;
  call_to_action: string;
  destination_url: string | null;
  deep_link: string | null;
  advertiser_entity_id: string;
  lead_form_id: string | null;
  media_sha256: string | null;
  auto_disclaimer: string | null;
  manual_disclaimer: string | null;
  paid_for_by: string | null;
  /* V4 — dynamic + lead form + brand safety + UTM. */
  dynamic_creative_enabled: boolean;
  text_overlay_pct: number | null;
  brand_safety_filter: "standard" | "limited" | "expanded" | null;
  deep_link_mobile: string | null;
  utm_params: Record<string, unknown>;
  display_url: string | null;
  created_at: string;
};

export type AdsAd = {
  id: string;
  ad_set_id: string;
  ad_account_id: string;
  campaign_id: string;
  creative_id: string;
  name: string;
  pixel_id: string | null;
  utm_params: Record<string, unknown> | null;
  status: "active" | "paused" | "archived" | "rejected";
  review_status:
    | "pending"
    | "auto_approved"
    | "approved"
    | "rejected"
    | "limited"
    | "re_review";
  review_feedback: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  quality_score: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  observed_ctr: number | null;
  created_at: string;
  updated_at: string;
};

export type AdsPixel = {
  id: string;
  ad_account_id: string;
  name: string;
  api_token: string;
  authorized_domains: string[];
  total_events: number;
  last_event_at: string | null;
  /* V4 — Pixel Helper. */
  last_helper_test_at: string | null;
  total_events_30d: number | null;
  created_at: string;
};

export type AdsCharge = {
  id: string;
  ad_account_id: string;
  amount: number;
  currency: string;
  type: "topup" | "threshold" | "monthly" | "manual" | "refund" | "spend";
  wallet_transaction_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_charge_id: string | null;
  invoice_url: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  description: string | null;
  created_at: string;
};

export type AdImpression = {
  id: string;
  ad_id: string;
  ad_set_id: string;
  campaign_id: string;
  ad_account_id: string;
  user_id: string | null;
  session_id: string | null;
  surface: string;
  position: number | null;
  bid_amount: number | null;
  charged_amount: number | null;
  device_type: string | null;
  locale: string | null;
  country: string | null;
  viewability_pct: number | null;
  view_duration_ms: number | null;
  client_ip_anon: string | null;
  client_user_agent: string | null;
  created_at: string;
};

export type AdClick = {
  id: string;
  ad_id: string;
  ad_set_id: string;
  campaign_id: string;
  ad_account_id: string;
  user_id: string | null;
  session_id: string | null;
  surface: string | null;
  source_impression_id: string | null;
  destination_url: string | null;
  fraud_score: number;
  is_invalid: boolean;
  invalid_reason: string | null;
  client_ip_anon: string | null;
  client_user_agent: string | null;
  created_at: string;
};

export type AdConversion = {
  id: string;
  pixel_id: string;
  ad_account_id: string;
  event_id: string;
  event_name: string;
  event_time: string;
  event_source: "pixel" | "conversions_api" | "both";
  attributed_ad_id: string | null;
  attributed_click_id: string | null;
  attribution_model: string | null;
  attribution_window_days: number | null;
  user_data: Record<string, unknown> | null;
  user_id: string | null;
  custom_data: Record<string, unknown> | null;
  client_ip_anon: string | null;
  fraud_score: number;
  is_invalid: boolean;
  created_at: string;
};

export type AdsLibraryEntry = {
  id: string;
  ad_id: string | null;
  ad_account_id: string;
  business_name: string;
  business_id: string | null;
  campaign_objective: string | null;
  creative_snapshot: Record<string, unknown>;
  targeting_summary: Record<string, unknown>;
  placements: string[];
  paid_for_by: string | null;
  first_served_at: string;
  last_served_at: string | null;
  is_active: boolean;
  impressions_range: string | null;
  spend_range: string | null;
  retention_until: string | null;
  created_at: string;
};

export type UserAdPreferences = {
  user_id: string;
  personalized_ads_consent: boolean;
  behavioral_data_consent: boolean;
  location_data_consent: boolean;
  blocked_categories: string[];
  blocked_advertisers: string[];
  removed_interests: string[];
  consent_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdReport = {
  id: string;
  reporter_id: string;
  ad_id: string | null;
  ads_library_entry_id: string | null;
  category:
    | "misleading"
    | "illegal"
    | "offensive"
    | "political_undisclosed"
    | "targeting_minors"
    | "sensitive_data"
    | "spam"
    | "other";
  description: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  created_at: string;
};

/* ========================================================================
 * Ads Manager avancé — migration 0050 (Smart + Expert)
 * ======================================================================== */

export type AttributionSetting =
  | "last_click_7d"
  | "last_click_1d"
  | "linear_7d"
  | "linear_28d"
  | "position_based_7d"
  | "time_decay_7d"
  | "data_driven"
  | "view_through_1d";

export type RecommendationType =
  | "budget_increase"
  | "budget_decrease"
  | "audience_expand"
  | "audience_create_lookalike"
  | "creative_refresh"
  | "creative_pause_fatigue"
  | "placement_optimize"
  | "bid_adjustment"
  | "keyword_add"
  | "keyword_remove"
  | "campaign_pause"
  | "schedule_optimize"
  | "seasonal_opportunity";

export type RecommendationSeverity = "low" | "medium" | "high" | "critical";
export type RecommendationStatus =
  | "pending"
  | "applied"
  | "dismissed"
  | "expired";

export type LeadFormType = "more_volume" | "higher_intent";
export type DynamicVariantType =
  | "media"
  | "primary_text"
  | "headline"
  | "description"
  | "cta";

export type CustomConversionCategory =
  | "add_to_cart"
  | "add_to_wishlist"
  | "complete_registration"
  | "contact"
  | "customize_product"
  | "donate"
  | "find_location"
  | "initiate_checkout"
  | "lead"
  | "purchase"
  | "schedule"
  | "search"
  | "start_trial"
  | "submit_application"
  | "subscribe"
  | "view_content"
  | "other";

export type OfflineMatchStatus =
  | "pending"
  | "matched"
  | "unmatched"
  | "duplicate";

export type WebsiteAnalysisStatus =
  | "pending"
  | "crawling"
  | "analyzing"
  | "completed"
  | "failed";

/* Résultat structuré du Website Analyzer (cache jsonb dans la table). */
export type WebsiteAnalysisResult = {
  business_name: string;
  business_description: string;
  business_category: string[];
  target_audience_inferred: string[];
  keywords_primary: Array<{
    keyword: string;
    search_volume?: number;
    competition_level?: "low" | "medium" | "high";
    estimated_cpc?: number;
    relevance_score: number;
    intent?: "informational" | "commercial" | "transactional" | "navigational";
  }>;
  keywords_secondary: Array<{ keyword: string; relevance_score: number }>;
  keywords_negative_suggested: string[];
  pages_detected: Array<{ url: string; title: string; type: string }>;
  products_detected?: Array<{
    name: string;
    price?: number;
    image_url?: string;
    description?: string;
  }>;
  services_detected?: Array<{ name: string; description?: string }>;
  audiences_recommended: Array<{
    persona_name: string;
    description: string;
    targeting_spec: Record<string, unknown>;
    estimated_size?: number;
  }>;
  interests_topics: string[];
  demographics_suggested: {
    age_min: number;
    age_max: number;
    genders: string[];
    languages: string[];
  };
  images_extracted: Array<{
    url: string;
    alt_text?: string;
    width?: number;
    height?: number;
    is_logo?: boolean;
  }>;
  brand_colors: string[];
  brand_fonts: string[];
  headlines_suggested: string[];
  descriptions_suggested: string[];
  cta_suggested: string[];
  objective_recommended: string;
  objective_alternatives: string[];
  budget_recommended_min: number;
  budget_recommended_optimal: number;
  estimated_reach_per_euro?: Record<string, number>;
  estimated_cpc_range?: [number, number];
  estimated_cpm_range?: [number, number];
  compliance_warnings: string[];
  forbidden_categories_detected: string[];
};

export type AdsWebsiteAnalysis = {
  id: string;
  ad_account_id: string | null;
  url_normalized: string;
  url_original: string;
  status: WebsiteAnalysisStatus;
  error_message: string | null;
  analysis_result: WebsiteAnalysisResult | null;
  business_name: string | null;
  business_category: string[] | null;
  primary_objective: string | null;
  pages_crawled: number;
  llm_tokens_used: number;
  cost_cents: number;
  duration_ms: number | null;
  expires_at: string;
  created_at: string;
  requested_by: string | null;
};

export type AdsKeywordResearch = {
  id: string;
  keyword: string;
  country: string;
  language: string;
  search_volume: number | null;
  competition_index: number | null;
  competition_level: "low" | "medium" | "high" | null;
  cpc_estimate: number | null;
  trend_12m: number[] | null;
  intent:
    | "informational"
    | "commercial"
    | "transactional"
    | "navigational"
    | "mixed"
    | null;
  related_topics: string[] | null;
  related_keywords: string[] | null;
  expires_at: string;
  fetched_at: string;
  data_source: string;
};

export type AdsLeadForm = {
  id: string;
  ad_account_id: string;
  name: string;
  form_type: LeadFormType;
  intro_image_url: string | null;
  intro_title: string;
  intro_description: string | null;
  questions: Array<Record<string, unknown>>;
  privacy_policy_url: string;
  consent_text: string;
  thankyou_title: string;
  thankyou_description: string | null;
  thankyou_cta_label: string | null;
  thankyou_cta_url: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  crm_integration: string | null;
  crm_config: Record<string, unknown> | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdsLeadFormResponse = {
  id: string;
  lead_form_id: string;
  ad_account_id: string;
  ad_id: string | null;
  campaign_id: string | null;
  user_id: string | null;
  answers: Record<string, unknown>;
  client_ip_anon: string | null;
  user_agent: string | null;
  webhook_delivered_at: string | null;
  webhook_response_code: number | null;
  webhook_attempts: number;
  submitted_at: string;
};

export type AdsDynamicCreativeVariant = {
  id: string;
  parent_creative_id: string;
  variant_type: DynamicVariantType;
  media_url: string | null;
  media_thumbnail_url: string | null;
  text_value: string | null;
  cta_value: string | null;
  position: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  performance_score: number | null;
  is_winner: boolean;
  created_at: string;
};

export type AdsCustomConversion = {
  id: string;
  ad_account_id: string;
  name: string;
  description: string | null;
  filter_spec: Record<string, unknown>;
  category: CustomConversionCategory;
  default_value: number | null;
  default_currency: string | null;
  total_count: number;
  total_value: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type AdsOfflineConversion = {
  id: string;
  ad_account_id: string;
  batch_id: string;
  event_name: string;
  event_time: string;
  hashed_email: string | null;
  hashed_phone: string | null;
  external_id: string | null;
  match_status: OfflineMatchStatus;
  matched_user_id: string | null;
  attributed_ad_id: string | null;
  attributed_click_id: string | null;
  attribution_model: string | null;
  custom_data: Record<string, unknown> | null;
  uploaded_by: string | null;
  uploaded_at: string;
  matched_at: string | null;
};

export type AdsRecommendation = {
  id: string;
  ad_account_id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  action_payload: Record<string, unknown> | null;
  estimated_impact: Record<string, unknown> | null;
  status: RecommendationStatus;
  applied_at: string | null;
  applied_by: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  expires_at: string;
  generated_at: string;
  model_version: string;
};

export type AdsSmartAudienceSegment = {
  id: string;
  website_analysis_id: string | null;
  ad_account_id: string | null;
  persona_name: string;
  persona_description: string | null;
  targeting_spec: Record<string, unknown>;
  estimated_size: number | null;
  estimated_cpa_min: number | null;
  estimated_cpa_max: number | null;
  ai_ranking: number;
  confidence_score: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & ProfileUpdate;
        Update: ProfileUpdate;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & Pick<Conversation, "type">;
        Update: Partial<Conversation>;
        Relationships: [];
      };
      conversation_members: {
        Row: ConversationMember;
        Insert: ConversationMember;
        Update: Partial<ConversationMember>;
        Relationships: [];
      };
      /* Chantier 2 (migration 0076) — appels. */
      call_sessions: {
        Row: {
          id: string;
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          kind: "audio" | "video";
          status:
            | "ringing"
            | "connecting"
            | "in_progress"
            | "ended"
            | "missed"
            | "rejected"
            | "failed";
          started_at: string;
          connected_at: string | null;
          ended_at: string | null;
          duration_ms: number | null;
          end_reason: string | null;
        };
        Insert: {
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          kind?: "audio" | "video";
          status?: string;
        };
        Update: Partial<{
          status:
            | "ringing"
            | "connecting"
            | "in_progress"
            | "ended"
            | "missed"
            | "rejected"
            | "failed";
          connected_at: string | null;
          ended_at: string | null;
          duration_ms: number | null;
          end_reason: string | null;
        }>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Pick<Message, "conversation_id" | "sender_id"> &
          Partial<
            Pick<
              Message,
              | "id"
              | "type"
              | "body"
              | "attachment_url"
              | "attachment_type"
              | "attachment_name"
              | "attachment_size"
              | "attachment_width"
              | "attachment_height"
              | "attachment_duration_ms"
              | "reply_to_message_id"
              /* Chantier 1 (migration 0073). */
              | "is_secret"
              | "encrypted_content"
              | "encryption_metadata"
              | "view_once"
              | "expires_at"
              | "forwarded_from_message_id"
              | "forwarded_from_user_id"
              | "thread_root_id"
              | "delivery_status"
            >
          >;
        Update: Partial<
          Pick<
            Message,
            | "body"
            | "edited_at"
            | "deleted_at"
            | "view_once_viewed_at"
            | "view_once_viewer_id"
            | "screenshot_detected"
            | "forward_count"
            | "delivery_status"
            | "is_pinned_in_conv"
            | "starred_by_user_ids"
            | "encrypted_content"
            | "encryption_metadata"
          >
        >;
        Relationships: [];
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Pick<MessageReaction, "message_id" | "user_id" | "emoji"> &
          Partial<Pick<MessageReaction, "id" | "conversation_id" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      friendships: {
        Row: Friendship;
        Insert: Pick<Friendship, "requester_id" | "recipient_id"> &
          Partial<Pick<Friendship, "intro_message" | "status">>;
        Update: Partial<Pick<Friendship, "status" | "intro_message" | "responded_at">>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<
          Notification,
          | "id"
          | "created_at"
          | "read_at"
          | "related_post_id"
          | "related_reel_id"
          | "related_reel_comment_id"
        > &
          Partial<
            Pick<
              Notification,
              | "id"
              | "created_at"
              | "read_at"
              | "related_post_id"
              | "related_reel_id"
              | "related_reel_comment_id"
            >
          >;
        Update: Partial<Pick<Notification, "read_at">>;
        Relationships: [];
      };
      user_notification_preferences: {
        Row: UserNotificationPreferences;
        Insert: Pick<UserNotificationPreferences, "user_id"> &
          Partial<
            Omit<UserNotificationPreferences, "user_id">
          >;
        Update: Partial<Omit<UserNotificationPreferences, "user_id">>;
        Relationships: [];
      };
      signal_identity_keys: {
        Row: SignalIdentityKey;
        Insert: Pick<
          SignalIdentityKey,
          "user_id" | "public_key" | "registration_id"
        > &
          Partial<Pick<SignalIdentityKey, "device_id">>;
        Update: Partial<
          Pick<SignalIdentityKey, "public_key" | "registration_id" | "device_id">
        >;
        Relationships: [];
      };
      signal_signed_prekeys: {
        Row: SignalSignedPreKey;
        Insert: Pick<
          SignalSignedPreKey,
          "user_id" | "prekey_id" | "public_key" | "signature"
        > &
          Partial<Pick<SignalSignedPreKey, "status">>;
        Update: Partial<Pick<SignalSignedPreKey, "status" | "rotated_at">>;
        Relationships: [];
      };
      signal_one_time_prekeys: {
        Row: SignalOneTimePreKey;
        Insert: Pick<
          SignalOneTimePreKey,
          "user_id" | "prekey_id" | "public_key"
        >;
        Update: never;
        Relationships: [];
      };
      signal_sessions: {
        Row: SignalSession;
        Insert: Pick<
          SignalSession,
          "conversation_id" | "user_a" | "user_b"
        >;
        Update: Partial<
          Pick<
            SignalSession,
            | "last_message_at"
            | "last_ratchet_at"
            | "message_count"
            | "is_compromised"
            | "compromised_at"
          >
        >;
        Relationships: [];
      };
      signal_safety_numbers: {
        Row: SignalSafetyNumber;
        Insert: Pick<
          SignalSafetyNumber,
          "user_a" | "user_b" | "safety_number" | "safety_number_hash"
        >;
        Update: Partial<
          Pick<
            SignalSafetyNumber,
            | "verified_by_a"
            | "verified_by_b"
            | "verified_a_at"
            | "verified_b_at"
            | "changed_at"
          >
        >;
        Relationships: [];
      };
      story_highlights: {
        Row: StoryHighlight;
        Insert: Pick<StoryHighlight, "user_id" | "title" | "cover_image_url"> &
          Partial<
            Pick<
              StoryHighlight,
              "id" | "sort_position" | "items_count" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Pick<StoryHighlight, "title" | "cover_image_url" | "sort_position">
        >;
        Relationships: [];
      };
      story_highlight_items: {
        Row: StoryHighlightItem;
        Insert: Pick<StoryHighlightItem, "highlight_id" | "story_id"> &
          Partial<Pick<StoryHighlightItem, "sort_position" | "added_at">>;
        Update: Partial<Pick<StoryHighlightItem, "sort_position">>;
        Relationships: [];
      };
      profile_recommendations: {
        Row: ProfileRecommendation;
        Insert: Pick<
          ProfileRecommendation,
          "from_user_id" | "to_user_id" | "relationship" | "body"
        > &
          Partial<
            Pick<
              ProfileRecommendation,
              "id" | "relationship_custom" | "is_visible" | "given_at" | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            ProfileRecommendation,
            "relationship" | "relationship_custom" | "body" | "is_visible"
          >
        >;
        Relationships: [];
      };
      profile_projects: {
        Row: ProfileProject;
        Insert: Pick<ProfileProject, "user_id" | "title"> &
          Partial<Omit<ProfileProject, "user_id" | "title" | "created_at">>;
        Update: Partial<Omit<ProfileProject, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_publications: {
        Row: ProfilePublication;
        Insert: Pick<ProfilePublication, "user_id" | "title" | "media_type"> &
          Partial<
            Omit<ProfilePublication, "user_id" | "title" | "media_type" | "created_at">
          >;
        Update: Partial<
          Omit<ProfilePublication, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      profile_volunteer: {
        Row: ProfileVolunteer;
        Insert: Pick<
          ProfileVolunteer,
          "user_id" | "organization" | "role" | "start_month"
        > &
          Partial<
            Omit<
              ProfileVolunteer,
              "user_id" | "organization" | "role" | "start_month" | "created_at"
            >
          >;
        Update: Partial<
          Omit<ProfileVolunteer, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      profile_awards: {
        Row: ProfileAward;
        Insert: Pick<ProfileAward, "user_id" | "title"> &
          Partial<Omit<ProfileAward, "user_id" | "title" | "created_at">>;
        Update: Partial<Omit<ProfileAward, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_open_to_work: {
        Row: ProfileOpenToWork;
        Insert: Pick<ProfileOpenToWork, "user_id"> &
          Partial<Omit<ProfileOpenToWork, "user_id" | "updated_at">>;
        Update: Partial<Omit<ProfileOpenToWork, "user_id" | "updated_at">>;
        Relationships: [];
      };
      user_follows: {
        Row: UserFollow;
        Insert: Pick<UserFollow, "follower_id" | "followed_id"> &
          Partial<Pick<UserFollow, "created_at">>;
        Update: never;
        Relationships: [];
      };
      close_friends: {
        Row: CloseFriend;
        Insert: Pick<CloseFriend, "user_id" | "close_friend_id"> &
          Partial<Pick<CloseFriend, "created_at">>;
        Update: never;
        Relationships: [];
      };
      user_badges: {
        Row: UserBadge;
        Insert: Pick<UserBadge, "user_id" | "badge_type" | "label"> &
          Partial<
            Omit<UserBadge, "user_id" | "badge_type" | "label" | "awarded_at">
          >;
        Update: Partial<Pick<UserBadge, "is_visible">>;
        Relationships: [];
      };
      creator_stats: {
        Row: CreatorStats;
        Insert: Pick<CreatorStats, "user_id"> &
          Partial<Omit<CreatorStats, "user_id" | "updated_at">>;
        Update: Partial<Omit<CreatorStats, "user_id" | "updated_at">>;
        Relationships: [];
      };
      creator_featured: {
        Row: CreatorFeatured;
        Insert: Pick<CreatorFeatured, "user_id" | "content_type"> &
          Partial<
            Omit<CreatorFeatured, "user_id" | "content_type" | "created_at">
          >;
        Update: Partial<
          Omit<CreatorFeatured, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      creator_collaborations: {
        Row: CreatorCollaboration;
        Insert: Pick<CreatorCollaboration, "user_id" | "brand_name"> &
          Partial<
            Omit<CreatorCollaboration, "user_id" | "brand_name" | "created_at">
          >;
        Update: Partial<
          Omit<CreatorCollaboration, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      creator_media_kit: {
        Row: CreatorMediaKit;
        Insert: Pick<CreatorMediaKit, "user_id"> &
          Partial<Omit<CreatorMediaKit, "user_id" | "updated_at">>;
        Update: Partial<Omit<CreatorMediaKit, "user_id" | "updated_at">>;
        Relationships: [];
      };
      entrepreneur_companies: {
        Row: EntrepreneurCompany;
        Insert: Pick<
          EntrepreneurCompany,
          "user_id" | "company_name" | "role" | "founder_status"
        > &
          Partial<
            Omit<
              EntrepreneurCompany,
              "user_id" | "company_name" | "role" | "founder_status" | "created_at"
            >
          >;
        Update: Partial<
          Omit<EntrepreneurCompany, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      entrepreneur_investments: {
        Row: EntrepreneurInvestment;
        Insert: Pick<EntrepreneurInvestment, "user_id" | "company_name"> &
          Partial<
            Omit<
              EntrepreneurInvestment,
              "user_id" | "company_name" | "created_at"
            >
          >;
        Update: Partial<
          Omit<EntrepreneurInvestment, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      entrepreneur_fundraising_status: {
        Row: EntrepreneurFundraisingStatus;
        Insert: Pick<EntrepreneurFundraisingStatus, "user_id"> &
          Partial<
            Omit<EntrepreneurFundraisingStatus, "user_id" | "updated_at">
          >;
        Update: Partial<
          Omit<EntrepreneurFundraisingStatus, "user_id" | "updated_at">
        >;
        Relationships: [];
      };
      draft_profiles: {
        Row: DraftProfile;
        Insert: Pick<DraftProfile, "user_id"> &
          Partial<
            Omit<DraftProfile, "user_id" | "created_at" | "updated_at">
          >;
        Update: Partial<
          Pick<DraftProfile, "payload" | "current_section" | "version">
        >;
        Relationships: [];
      };
      identity_verification_requests: {
        Row: IdentityVerificationRequest;
        Insert: Pick<
          IdentityVerificationRequest,
          "user_id" | "verification_type"
        > &
          Partial<
            Omit<
              IdentityVerificationRequest,
              "user_id" | "verification_type" | "submitted_at"
            >
          >;
        Update: Partial<
          Pick<IdentityVerificationRequest, "applicant_notes">
        >;
        Relationships: [];
      };
      orders: {
        Row: Order;
        /* Insert : buyer_id, seller_id, listing_id, listing_snapshot,
         * item_price, total_amount, seller_amount sont requis. order_number
         * est généré par trigger. Tout le reste a une DEFAULT côté DB. */
        Insert: Pick<
          Order,
          | "buyer_id"
          | "seller_id"
          | "listing_id"
          | "listing_snapshot"
          | "item_price"
          | "total_amount"
          | "seller_amount"
        > &
          Partial<
            Omit<
              Order,
              | "id"
              | "order_number"
              | "buyer_id"
              | "seller_id"
              | "listing_id"
              | "listing_snapshot"
              | "item_price"
              | "total_amount"
              | "seller_amount"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<
          Omit<
            Order,
            | "id"
            | "order_number"
            | "buyer_id"
            | "seller_id"
            | "listing_id"
            | "created_at"
            | "updated_at"
          >
        >;
        Relationships: [];
      };
      order_status_changes: {
        Row: OrderStatusChange;
        Insert: Pick<OrderStatusChange, "order_id" | "to_status"> &
          Partial<Omit<OrderStatusChange, "order_id" | "to_status">>;
        Update: never;
        Relationships: [];
      };
      order_shipping_details: {
        Row: OrderShippingDetails;
        Insert: Pick<OrderShippingDetails, "order_id" | "method"> &
          Partial<Omit<OrderShippingDetails, "id" | "order_id" | "method" | "created_at" | "updated_at">>;
        Update: Partial<Omit<OrderShippingDetails, "id" | "order_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      order_tracking_events: {
        Row: OrderTrackingEvent;
        Insert: Pick<OrderTrackingEvent, "order_id" | "event_type" | "event_at"> &
          Partial<Omit<OrderTrackingEvent, "id" | "order_id" | "event_type" | "event_at" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      /* Chantier 6 (migration 0088) — Reviews & Disputes. */
      marketplace_reviews: {
        Row: MarketplaceReview;
        Insert: Pick<
          MarketplaceReview,
          "order_id" | "reviewer_id" | "reviewee_id" | "reviewer_role" | "rating"
        > &
          Partial<
            Pick<MarketplaceReview, "id" | "body" | "created_at" | "updated_at">
          >;
        Update: Partial<Pick<MarketplaceReview, "rating" | "body">>;
        Relationships: [];
      };
      marketplace_disputes: {
        Row: MarketplaceDispute;
        Insert: Pick<
          MarketplaceDispute,
          "order_id" | "opened_by" | "opened_by_role" | "reason"
        > &
          Partial<
            Omit<
              MarketplaceDispute,
              | "order_id"
              | "opened_by"
              | "opened_by_role"
              | "reason"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            MarketplaceDispute,
            | "status"
            | "responder_body"
            | "responded_at"
            | "resolved_at"
            | "resolution_note"
            | "refund_amount"
          >
        >;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        /* Insert : seller_id + title + price_amount + price_currency + category
         * sont requis. Tout le reste a une DEFAULT côté DB → optional côté TS. */
        Insert: Pick<
          Listing,
          "seller_id" | "title" | "price_amount" | "price_currency" | "category"
        > &
          Partial<
            Omit<Listing, "seller_id" | "title" | "price_amount" | "price_currency" | "category">
          >;
        Update: Partial<Omit<Listing, "id" | "seller_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      listing_photos: {
        Row: ListingPhoto;
        Insert: Pick<ListingPhoto, "listing_id" | "url" | "position"> &
          Partial<
            Pick<
              ListingPhoto,
              | "id"
              | "created_at"
              | "aspect_ratio"
              | "width"
              | "height"
            >
          >;
        Update: Partial<
          Pick<
            ListingPhoto,
            "url" | "position" | "aspect_ratio" | "width" | "height"
          >
        >;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Pick<Favorite, "user_id" | "listing_id">;
        Update: never;
        Relationships: [];
      };
      content_embeddings: {
        Row: ContentEmbedding;
        Insert: Pick<ContentEmbedding, "post_id" | "embedding"> &
          Partial<
            Pick<ContentEmbedding, "model" | "source_text" | "generated_at">
          >;
        Update: Partial<
          Pick<ContentEmbedding, "embedding" | "model" | "source_text" | "generated_at">
        >;
        Relationships: [];
      };
      reel_embeddings: {
        Row: ReelEmbedding;
        Insert: Pick<ReelEmbedding, "reel_id" | "embedding"> &
          Partial<
            Pick<ReelEmbedding, "model" | "source_text" | "generated_at">
          >;
        Update: Partial<
          Pick<ReelEmbedding, "embedding" | "model" | "source_text" | "generated_at">
        >;
        Relationships: [];
      };
      recsys_events: {
        Row: RecsysEvent;
        Insert: Pick<
          RecsysEvent,
          "event_id" | "user_id" | "session_id" | "event_type"
        > &
          Partial<
            Pick<
              RecsysEvent,
              | "surface"
              | "position"
              | "target_post_id"
              | "target_user_id"
              | "target_listing_id"
              | "target_job_id"
              | "target_circle_id"
              | "properties"
              | "device_type"
              | "locale"
              | "client_ts"
              | "created_at"
            >
          >;
        Update: never;
        Relationships: [];
      };
      user_interest_profiles: {
        Row: UserInterestProfile;
        Insert: Pick<UserInterestProfile, "user_id"> &
          Partial<
            Pick<
              UserInterestProfile,
              | "interest_vector"
              | "topic_affinity"
              | "user_affinity"
              | "circle_affinity"
              | "behavioral_features"
              | "format_preference"
              | "active_hours_distribution"
              | "events_processed_count"
              | "profile_version"
              | "last_updated"
            >
          >;
        Update: Partial<
          Pick<
            UserInterestProfile,
            | "interest_vector"
            | "topic_affinity"
            | "user_affinity"
            | "circle_affinity"
            | "behavioral_features"
            | "format_preference"
            | "active_hours_distribution"
            | "events_processed_count"
            | "profile_version"
            | "last_updated"
          >
        >;
        Relationships: [];
      };
      user_algorithm_settings: {
        Row: UserAlgorithmSettings;
        Insert: Pick<UserAlgorithmSettings, "user_id"> &
          Partial<
            Pick<
              UserAlgorithmSettings,
              | "chronological_mode"
              | "personalization_consent"
              | "location_consent"
              | "contacts_consent"
              | "ads_consent"
              | "consent_timestamp"
              | "hidden_topics"
              | "hidden_users"
              | "manual_topics"
              | "anti_doomscroll_enabled"
              | "author_diversity_enabled"
              | "signal_filter_enabled"
              | "default_feed_mode"
              | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            UserAlgorithmSettings,
            | "chronological_mode"
            | "personalization_consent"
            | "location_consent"
            | "contacts_consent"
            | "ads_consent"
            | "consent_timestamp"
            | "hidden_topics"
            | "hidden_users"
            | "manual_topics"
            | "anti_doomscroll_enabled"
            | "author_diversity_enabled"
            | "signal_filter_enabled"
            | "default_feed_mode"
            | "updated_at"
          >
        >;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Pick<
          PushSubscriptionRow,
          "user_id" | "endpoint" | "p256dh" | "auth"
        > &
          Partial<
            Pick<
              PushSubscriptionRow,
              "id" | "user_agent" | "created_at" | "last_success_at"
            >
          >;
        Update: Partial<Pick<PushSubscriptionRow, "last_success_at">>;
        Relationships: [];
      };
      payout_requests: {
        Row: PayoutRequest;
        Insert: Pick<
          PayoutRequest,
          "user_id" | "amount" | "currency" | "iban" | "account_holder"
        > &
          Partial<
            Pick<
              PayoutRequest,
              | "id"
              | "bic"
              | "status"
              | "admin_note"
              | "created_at"
              | "processed_at"
              | "processed_by"
            >
          >;
        Update: Partial<
          Pick<PayoutRequest, "status" | "admin_note">
        >;
        Relationships: [];
      };
      listing_offers: {
        Row: ListingOffer;
        Insert: Pick<
          ListingOffer,
          "listing_id" | "from_user" | "to_user" | "amount" | "currency"
        > &
          Partial<
            Pick<
              ListingOffer,
              | "id"
              | "parent_offer_id"
              | "message"
              | "status"
              | "created_at"
              | "responded_at"
              | "expires_at"
            >
          >;
        Update: Partial<
          Pick<ListingOffer, "status" | "responded_at">
        >;
        Relationships: [];
      };
      posts: {
        Row: Post;
        Insert: Pick<Post, "author_id"> &
          Partial<
            Pick<
              Post,
              | "id"
              | "body"
              | "visibility"
              | "video_url"
              | "video_thumbnail_url"
              | "video_duration_ms"
              | "video_width"
              | "video_height"
              | "video_hls_url"
              | "video_provider_asset_id"
              | "video_status"
              | "video_error"
              | "video_blurhash"
              | "circle_id"
              | "edited_at"
              | "deleted_at"
              /* V4 — posts enrichis. */
              | "background_color"
              | "sentiment_emoji"
              | "sentiment_label"
              | "activity_type"
              | "activity_detail"
              | "location_name"
              | "location_city"
              | "location_country"
              | "location_lat"
              | "location_lng"
              | "link_preview"
              | "audience_excluded_user_ids"
              | "is_carousel"
              | "carousel_slides"
              | "scheduled_for"
              | "published_at"
              | "status"
              /* Chantier 3 cercles (migration 0093). */
              | "flair_id"
              | "is_locked"
              | "is_announcement"
              | "requires_approval"
              /* Chantier Feed v2 (migration 0110). */
              | "post_kind"
              | "thread_root_id"
              | "thread_reply_to_id"
              | "thread_position"
              | "audience_snapshot"
              /* Chantier Feed v2 (migration 0111) — counters. */
              | "reactions_counts"
              | "total_reactions"
              /* Chantier Feed v2 (migration 0115) — quote-post. */
              | "quoted_post_id"
              | "quotes_count"
            >
          >;
        Update: Partial<
          Pick<
            Post,
            | "body"
            | "visibility"
            | "circle_id"
            | "pinned_at"
            | "pinned_by"
            | "flair_id"
            | "is_locked"
            | "is_announcement"
            | "requires_approval"
            | "approved_by"
            | "approved_at"
            | "post_kind"
            | "thread_root_id"
            | "thread_reply_to_id"
            | "thread_position"
            | "audience_snapshot"
            | "quoted_post_id"
            | "quotes_count"
            | "edited_at"
            | "deleted_at"
            | "video_url"
            | "video_thumbnail_url"
            | "video_duration_ms"
            | "video_width"
            | "video_height"
            | "video_hls_url"
            | "video_provider_asset_id"
            | "video_status"
            | "video_error"
            | "video_blurhash"
            | "background_color"
            | "sentiment_emoji"
            | "sentiment_label"
            | "activity_type"
            | "activity_detail"
            | "location_name"
            | "location_city"
            | "location_country"
            | "location_lat"
            | "location_lng"
            | "link_preview"
            | "audience_excluded_user_ids"
            | "is_carousel"
            | "carousel_slides"
            | "scheduled_for"
            | "published_at"
            | "status"
          >
        >;
        Relationships: [];
      };
      post_photos: {
        Row: PostPhoto;
        Insert: Pick<PostPhoto, "post_id" | "url" | "position"> &
          Partial<
            Pick<
              PostPhoto,
              | "id"
              | "created_at"
              | "aspect_ratio"
              | "width"
              | "height"
            >
          >;
        Update: Partial<
          Pick<PostPhoto, "url" | "position" | "aspect_ratio" | "width" | "height">
        >;
        Relationships: [];
      };
      post_likes: {
        Row: PostLike;
        Insert: Pick<PostLike, "post_id" | "user_id">;
        Update: never;
        Relationships: [];
      };
      /* Chantier Feed v2 (migration 0111) — reactions 6 types. */
      post_reactions: {
        Row: PostReaction;
        Insert: Pick<PostReaction, "post_id" | "user_id" | "reaction_type"> &
          Partial<Pick<PostReaction, "created_at">>;
        Update: never;
        Relationships: [];
      };
      post_tagged_users: {
        Row: PostTaggedUser;
        Insert: Pick<PostTaggedUser, "post_id" | "user_id"> &
          Partial<
            Pick<
              PostTaggedUser,
              "id" | "photo_id" | "position_x" | "position_y" | "created_at"
            >
          >;
        Update: Partial<
          Pick<PostTaggedUser, "position_x" | "position_y">
        >;
        Relationships: [];
      };
      post_polls: {
        Row: PostPoll;
        Insert: Pick<PostPoll, "post_id" | "question"> &
          Partial<
            Pick<
              PostPoll,
              | "id"
              | "multi_choice"
              | "is_anonymous"
              | "ends_at"
              | "total_votes"
              | "created_at"
              | "is_closed"
            >
          >;
        Update: Partial<
          Pick<PostPoll, "question" | "ends_at" | "is_anonymous" | "is_closed">
        >;
        Relationships: [];
      };
      post_poll_options: {
        Row: PostPollOption;
        Insert: Pick<PostPollOption, "poll_id" | "position" | "label"> &
          Partial<
            Pick<PostPollOption, "id" | "votes_count" | "created_at" | "emoji">
          >;
        Update: Partial<Pick<PostPollOption, "label" | "position" | "emoji">>;
        Relationships: [];
      };
      post_poll_votes: {
        Row: PostPollVote;
        Insert: Pick<PostPollVote, "poll_id" | "option_id" | "user_id"> &
          Partial<Pick<PostPollVote, "created_at">>;
        Update: never;
        Relationships: [];
      };
      sounds: {
        Row: Sound;
        Insert: Pick<Sound, "title" | "artist" | "duration_seconds" | "audio_url"> &
          Partial<
            Pick<
              Sound,
              | "id"
              | "artwork_url"
              | "source"
              | "license_info"
              | "usage_count"
              | "is_explicit"
              | "created_by"
              | "source_reel_id"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            Sound,
            | "title"
            | "artist"
            | "artwork_url"
            | "license_info"
            | "is_explicit"
          >
        >;
        Relationships: [];
      };
      reels: {
        Row: Reel;
        Insert: Pick<Reel, "author_id" | "video_url" | "duration_seconds"> &
          Partial<Omit<Reel, "author_id" | "video_url" | "duration_seconds">>;
        Update: Partial<Omit<Reel, "id" | "author_id" | "created_at">>;
        Relationships: [];
      };
      reel_likes: {
        Row: ReelLike;
        Insert: Pick<ReelLike, "reel_id" | "user_id"> &
          Partial<Pick<ReelLike, "created_at">>;
        Update: never;
        Relationships: [];
      };
      reel_saves: {
        Row: ReelSave;
        Insert: Pick<ReelSave, "reel_id" | "user_id"> &
          Partial<Pick<ReelSave, "created_at">>;
        Update: never;
        Relationships: [];
      };
      reel_views: {
        Row: ReelView;
        Insert: Pick<ReelView, "reel_id" | "user_id"> &
          Partial<Omit<ReelView, "reel_id" | "user_id">>;
        Update: Partial<
          Pick<
            ReelView,
            | "watch_ms"
            | "completed_pct"
            | "replay_count"
            | "skipped"
            | "did_like"
            | "did_save"
            | "did_share"
            | "did_comment"
          >
        >;
        Relationships: [];
      };
      reel_comments: {
        Row: ReelComment;
        Insert: Pick<ReelComment, "reel_id" | "author_id" | "body"> &
          Partial<Omit<ReelComment, "reel_id" | "author_id" | "body">>;
        Update: Partial<Pick<ReelComment, "body" | "edited_at" | "deleted_at">>;
        Relationships: [];
      };
      reel_duets: {
        Row: ReelDuet;
        Insert: Pick<ReelDuet, "source_reel_id" | "duet_reel_id"> &
          Partial<Pick<ReelDuet, "id" | "layout" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      reel_stitches: {
        Row: ReelStitch;
        Insert: Pick<
          ReelStitch,
          "source_reel_id" | "stitch_reel_id" | "segment_start_ms" | "segment_end_ms"
        > &
          Partial<Pick<ReelStitch, "id" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      reel_comment_likes: {
        Row: ReelCommentLike;
        Insert: Pick<ReelCommentLike, "comment_id" | "user_id"> &
          Partial<Pick<ReelCommentLike, "created_at">>;
        Update: never;
        Relationships: [];
      };
      post_comments: {
        Row: PostComment;
        Insert: Omit<PostComment, "id" | "created_at" | "edited_at" | "deleted_at"> &
          Partial<Pick<PostComment, "id" | "edited_at" | "deleted_at">>;
        Update: Partial<Pick<PostComment, "body" | "edited_at" | "deleted_at">>;
        Relationships: [];
      };
      hashtags: {
        Row: Hashtag;
        Insert: Pick<Hashtag, "tag"> &
          Partial<Pick<Hashtag, "id" | "posts_count" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      post_collections: {
        Row: PostCollection;
        Insert: Pick<PostCollection, "user_id" | "name"> &
          Partial<
            Pick<
              PostCollection,
              | "id"
              | "emoji"
              | "is_private"
              | "bookmarks_count"
              | "position_order"
              | "created_at"
              | "cover_url"
              | "description"
              | "is_archived"
              | "share_slug"
              | "color_theme"
              | "last_post_at"
            >
          >;
        Update: Partial<
          Pick<
            PostCollection,
            | "name"
            | "emoji"
            | "is_private"
            | "position_order"
            | "cover_url"
            | "description"
            | "is_archived"
            | "share_slug"
            | "color_theme"
            | "last_post_at"
          >
        >;
        Relationships: [];
      };
      post_bookmarks: {
        Row: PostBookmark;
        Insert: Pick<PostBookmark, "user_id" | "post_id"> &
          Partial<
            Pick<
              PostBookmark,
              | "collection_id"
              | "created_at"
              | "reading_state"
              | "note"
              | "last_seen_at"
            >
          >;
        Update: Partial<
          Pick<
            PostBookmark,
            "collection_id" | "reading_state" | "note" | "last_seen_at"
          >
        >;
        Relationships: [];
      };
      pro_connections: {
        Row: ProConnection;
        Insert: Pick<ProConnection, "requester_id" | "recipient_id"> &
          Partial<Pick<ProConnection, "id" | "context" | "intro" | "status" | "responded_at">>;
        Update: Partial<Pick<ProConnection, "status" | "responded_at" | "intro" | "context">>;
        Relationships: [];
      };
      mentor_offers: {
        Row: MentorOffer;
        Insert: Pick<MentorOffer, "user_id" | "bio"> &
          Partial<
            Pick<
              MentorOffer,
              | "id"
              | "topics"
              | "hourly_rate"
              | "rate_currency"
              | "languages"
              | "is_available"
              | "sessions_count"
              | "rating_avg"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<Omit<MentorOffer, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      mentor_sessions: {
        Row: MentorSession;
        Insert: Pick<MentorSession, "mentor_id" | "mentee_id" | "topic"> &
          Partial<
            Pick<
              MentorSession,
              | "id"
              | "message"
              | "scheduled_at"
              | "duration_min"
              | "status"
              | "rating"
              | "rating_comment"
              | "responded_at"
              | "completed_at"
            >
          >;
        Update: Partial<
          Pick<
            MentorSession,
            | "status"
            | "scheduled_at"
            | "duration_min"
            | "responded_at"
            | "completed_at"
            | "rating"
            | "rating_comment"
          >
        >;
        Relationships: [];
      };
      skill_quizzes: {
        Row: SkillQuiz;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      skill_quiz_questions: {
        Row: SkillQuizQuestion;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      skill_quiz_attempts: {
        Row: SkillQuizAttempt;
        Insert: Pick<SkillQuizAttempt, "user_id" | "quiz_id" | "score" | "total" | "passed"> &
          Partial<Pick<SkillQuizAttempt, "id" | "answers" | "started_at" | "finished_at">>;
        Update: never;
        Relationships: [];
      };
      live_sessions: {
        Row: LiveSession;
        Insert: Pick<LiveSession, "host_id" | "title" | "scheduled_at"> &
          Partial<
            Pick<
              LiveSession,
              | "id"
              | "company_id"
              | "job_id"
              | "description"
              | "duration_min"
              | "status"
              | "attendees_count"
              | "started_at"
              | "ended_at"
            >
          >;
        Update: Partial<
          Pick<LiveSession, "title" | "description" | "scheduled_at" | "status" | "started_at" | "ended_at">
        >;
        Relationships: [];
      };
      live_session_attendees: {
        Row: { session_id: string; user_id: string; joined_at: string };
        Insert: { session_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      live_session_messages: {
        Row: LiveSessionMessage;
        Insert: Pick<LiveSessionMessage, "session_id" | "user_id" | "body"> &
          Partial<Pick<LiveSessionMessage, "id" | "is_question" | "created_at">>;
        Update: never;
        Relationships: [];
      };
      post_hashtags: {
        Row: PostHashtag;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      post_mentions: {
        Row: PostMention;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Omit<
          Job,
          "id" | "created_at" | "updated_at" | "closed_at" | "company_id"
        > &
          Partial<Pick<Job, "id" | "status" | "closed_at" | "company_id">>;
        Update: Partial<Omit<Job, "id" | "poster_id" | "created_at">>;
        Relationships: [];
      };
      job_applications: {
        Row: JobApplication;
        Insert: Omit<JobApplication, "id" | "created_at" | "responded_at" | "status"> &
          Partial<Pick<JobApplication, "id" | "status" | "responded_at">>;
        Update: Partial<Pick<JobApplication, "status" | "responded_at" | "message">>;
        Relationships: [];
      };
      saved_jobs: {
        Row: { user_id: string; job_id: string; created_at: string };
        Insert: { user_id: string; job_id: string };
        Update: never;
        Relationships: [];
      };
      wallets: {
        Row: Wallet;
        Insert: Wallet;
        Update: Partial<Pick<Wallet, "balance" | "updated_at">>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at"> &
          Partial<Pick<Transaction, "id" | "created_at" | "status">>;
        Update: never;
        Relationships: [];
      };
      stories: {
        Row: Story;
        Insert: Pick<
          Story,
          | "author_id"
          | "type"
          | "photo_url"
          | "caption"
          | "background"
          | "filter"
          | "video_url"
          | "video_thumbnail_url"
          | "video_duration_ms"
          | "caption_position"
          | "stickers"
        > &
          Partial<
            Pick<
              Story,
              | "id"
              | "expires_at"
              | "aspect_ratio"
              | "width"
              | "height"
            >
          >;
        Update: never;
        Relationships: [];
      };
      story_views: {
        Row: StoryView;
        Insert: Pick<StoryView, "story_id" | "viewer_id">;
        Update: never;
        Relationships: [];
      };
      circles: {
        Row: Circle;
        /* Insert : slug + name + owner_id requis. Tout le reste a un DEFAULT
         * côté DB (migrations 0028 + 0091) → optional côté TS. */
        Insert: Pick<Circle, "slug" | "name" | "owner_id"> &
          Partial<Omit<Circle, "slug" | "name" | "owner_id">>;
        Update: Partial<Omit<Circle, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      circle_members: {
        Row: CircleMember;
        Insert: Pick<CircleMember, "circle_id" | "user_id"> &
          Partial<Omit<CircleMember, "circle_id" | "user_id">>;
        Update: Partial<
          Omit<CircleMember, "circle_id" | "user_id" | "joined_at">
        >;
        Relationships: [];
      };
      /* Migration 0093 — règles, flairs, votes. */
      circle_rules: {
        Row: CircleRule;
        Insert: Pick<CircleRule, "circle_id" | "position" | "title"> &
          Partial<
            Pick<
              CircleRule,
              "id" | "description" | "icon" | "is_critical" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            CircleRule,
            "position" | "title" | "description" | "icon" | "is_critical"
          >
        >;
        Relationships: [];
      };
      circle_flairs: {
        Row: CircleFlair;
        Insert: Pick<CircleFlair, "circle_id" | "slug" | "label"> &
          Partial<
            Pick<CircleFlair, "id" | "color" | "position" | "created_at">
          >;
        Update: Partial<
          Pick<CircleFlair, "slug" | "label" | "color" | "position">
        >;
        Relationships: [];
      };
      circle_post_votes: {
        Row: CirclePostVote;
        Insert: Pick<
          CirclePostVote,
          "user_id" | "post_id" | "vote_type"
        > &
          Partial<Pick<CirclePostVote, "created_at">>;
        Update: never;
        Relationships: [];
      };
      /* Migration 0108 — Module Mentorat. */
      circle_mentor_offers: {
        Row: CircleMentorOffer;
        Insert: Pick<
          CircleMentorOffer,
          "circle_id" | "mentor_user_id" | "headline"
        > &
          Partial<
            Omit<
              CircleMentorOffer,
              "circle_id" | "mentor_user_id" | "headline" | "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            CircleMentorOffer,
            | "headline"
            | "bio"
            | "expertise"
            | "availability"
            | "capacity"
            | "current_mentees"
            | "is_open"
          >
        >;
        Relationships: [];
      };
      /* Chantier 5.4 (migration 0104) — système d'ambassadeurs. */
      circle_ambassador_rewards: {
        Row: CircleAmbassadorReward;
        Insert: Pick<CircleAmbassadorReward, "user_id" | "circle_id"> &
          Partial<
            Omit<CircleAmbassadorReward, "user_id" | "circle_id" | "created_at" | "updated_at">
          >;
        Update: Partial<
          Pick<
            CircleAmbassadorReward,
            "invitations_sent" | "invitations_accepted" | "badges" | "current_level"
          >
        >;
        Relationships: [];
      };
      /* Chantier 4.5 (migration 0102) — règles AutoMod. */
      circle_automod_rules: {
        Row: CircleAutomodRule;
        Insert: Pick<
          CircleAutomodRule,
          "circle_id" | "created_by" | "rule_type"
        > &
          Partial<
            Omit<
              CircleAutomodRule,
              | "circle_id"
              | "created_by"
              | "rule_type"
              | "id"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            CircleAutomodRule,
            | "config"
            | "on_match_action"
            | "enabled"
            | "match_count"
            | "last_matched_at"
          >
        >;
        Relationships: [];
      };
      /* Chantier 4.4 (migration 0101) — sanctions progressives. */
      circle_sanctions: {
        Row: CircleSanction;
        Insert: Pick<
          CircleSanction,
          "circle_id" | "target_user_id" | "level" | "action"
        > &
          Partial<
            Omit<
              CircleSanction,
              | "circle_id"
              | "target_user_id"
              | "level"
              | "action"
              | "id"
              | "issued_at"
            >
          >;
        Update: Partial<
          Pick<CircleSanction, "lifted_at" | "lifted_by" | "lifted_reason">
        >;
        Relationships: [];
      };
      /* Chantier 4.3 (migration 0100) — audit log modération. */
      circle_moderation_actions: {
        Row: CircleModerationAction;
        Insert: Pick<
          CircleModerationAction,
          "circle_id" | "actor_user_id" | "action_type"
        > &
          Partial<
            Omit<
              CircleModerationAction,
              "circle_id" | "actor_user_id" | "action_type" | "id" | "created_at"
            >
          >;
        Update: never;
        Relationships: [];
      };
      /* Chantier 3.5 (migration 0098) — bibliothèque collaborative. */
      circle_library_categories: {
        Row: CircleLibraryCategory;
        Insert: Pick<CircleLibraryCategory, "circle_id" | "label"> &
          Partial<
            Omit<CircleLibraryCategory, "circle_id" | "label" | "id" | "created_at" | "updated_at">
          >;
        Update: Partial<
          Pick<CircleLibraryCategory, "label" | "description" | "position" | "icon">
        >;
        Relationships: [];
      };
      circle_library_items: {
        Row: CircleLibraryItem;
        Insert: Pick<
          CircleLibraryItem,
          "circle_id" | "created_by" | "type" | "title"
        > &
          Partial<
            Omit<
              CircleLibraryItem,
              "circle_id" | "created_by" | "type" | "title" | "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Pick<
            CircleLibraryItem,
            | "category_id"
            | "type"
            | "title"
            | "description"
            | "content_url"
            | "body"
            | "tags"
            | "is_approved"
            | "approved_by"
            | "approved_at"
            | "views_count"
            | "saves_count"
          >
        >;
        Relationships: [];
      };
      circle_events: {
        Row: CircleEvent;
        Insert: Pick<
          CircleEvent,
          "circle_id" | "author_id" | "title" | "starts_at"
        > &
          Partial<
            Pick<
              CircleEvent,
              | "id"
              | "description"
              | "location"
              | "category"
              | "ends_at"
              | "capacity"
              | "attendance_count"
              | "lat"
              | "lng"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            CircleEvent,
            | "title"
            | "description"
            | "location"
            | "category"
            | "starts_at"
            | "ends_at"
            | "capacity"
            | "lat"
            | "lng"
            | "reminded_24h_at"
            | "reminded_1h_at"
          >
        >;
        Relationships: [];
      };
      circle_event_attendance: {
        Row: CircleEventAttendance;
        Insert: Pick<CircleEventAttendance, "event_id" | "user_id"> &
          Partial<Pick<CircleEventAttendance, "status" | "responded_at">>;
        Update: Partial<Pick<CircleEventAttendance, "status">>;
        Relationships: [];
      };
      circle_invitations: {
        Row: CircleInvitation;
        Insert: Pick<CircleInvitation, "circle_id" | "token" | "created_by"> &
          Partial<
            Pick<
              CircleInvitation,
              | "id"
              | "max_uses"
              | "uses"
              | "expires_at"
              | "revoked_at"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<CircleInvitation, "max_uses" | "expires_at" | "revoked_at">
        >;
        Relationships: [];
      };
      companies: {
        Row: Company;
        Insert: Pick<Company, "slug" | "name" | "owner_id"> &
          Partial<
            Pick<
              Company,
              | "id"
              | "tagline"
              | "description"
              | "logo_url"
              | "cover_url"
              | "website"
              | "industry"
              | "size_label"
              | "headquarters"
              | "founded_year"
              | "verified"
              | "followers_count"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<Omit<Company, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      company_followers: {
        Row: CompanyFollower;
        Insert: Pick<CompanyFollower, "company_id" | "user_id">;
        Update: never;
        Relationships: [];
      };
      profile_experiences: {
        Row: ProfileExperience;
        Insert: Pick<
          ProfileExperience,
          "user_id" | "title" | "company_name" | "start_month"
        > &
          Partial<
            Pick<
              ProfileExperience,
              | "id"
              | "company_id"
              | "employment_type"
              | "work_mode"
              | "location"
              | "description"
              | "end_month"
              | "is_current"
              | "position_order"
              | "created_at"
            >
          >;
        Update: Partial<Omit<ProfileExperience, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_education: {
        Row: ProfileEducation;
        Insert: Pick<ProfileEducation, "user_id" | "school"> &
          Partial<
            Pick<
              ProfileEducation,
              | "id"
              | "degree"
              | "field_of_study"
              | "start_year"
              | "end_year"
              | "description"
              | "position_order"
              | "created_at"
            >
          >;
        Update: Partial<Omit<ProfileEducation, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_skills: {
        Row: ProfileSkill;
        Insert: Pick<ProfileSkill, "user_id" | "name"> &
          Partial<
            Pick<
              ProfileSkill,
              | "id"
              | "level"
              | "position_order"
              | "endorsements_count"
              | "created_at"
            >
          >;
        Update: Partial<Omit<ProfileSkill, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      skill_endorsements: {
        Row: SkillEndorsement;
        Insert: Pick<SkillEndorsement, "skill_id" | "endorser_id">;
        Update: never;
        Relationships: [];
      };
      profile_languages: {
        Row: ProfileLanguage;
        Insert: Pick<ProfileLanguage, "user_id" | "name" | "level"> &
          Partial<Pick<ProfileLanguage, "id" | "position_order" | "created_at">>;
        Update: Partial<Omit<ProfileLanguage, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_certifications: {
        Row: ProfileCertification;
        Insert: Pick<ProfileCertification, "user_id" | "name" | "issuer"> &
          Partial<
            Pick<
              ProfileCertification,
              | "id"
              | "issued_month"
              | "expires_month"
              | "credential_url"
              | "position_order"
              | "created_at"
            >
          >;
        Update: Partial<
          Omit<ProfileCertification, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      job_saved_searches: {
        Row: JobSavedSearch;
        Insert: Pick<JobSavedSearch, "user_id" | "label"> &
          Partial<
            Pick<
              JobSavedSearch,
              | "id"
              | "query"
              | "category"
              | "job_type"
              | "work_mode"
              | "experience_level"
              | "location"
              | "alerts_enabled"
              | "last_notified_at"
              | "created_at"
            >
          >;
        Update: Partial<Omit<JobSavedSearch, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      profile_views: {
        Row: ProfileView;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      job_referrals: {
        Row: JobReferral;
        Insert: Pick<JobReferral, "job_id" | "referrer_id" | "referred_id"> &
          Partial<
            Pick<
              JobReferral,
              | "id"
              | "message"
              | "acknowledged_at"
              | "application_id"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<JobReferral, "message" | "acknowledged_at" | "application_id">
        >;
        Relationships: [];
      };
      /* ===== Trust & Safety (migrations 0046 + 0047) ===== */
      moderation_reports: {
        Row: ModerationReport;
        Insert: Pick<
          ModerationReport,
          "reporter_id" | "target_type" | "category"
        > &
          Partial<
            Pick<
              ModerationReport,
              | "id"
              | "target_post_id"
              | "target_comment_id"
              | "target_user_id"
              | "target_message_id"
              | "target_listing_id"
              | "target_story_id"
              | "target_job_id"
              | "subcategory"
              | "description"
              | "evidence_urls"
              | "reporter_ip"
              | "reporter_user_agent"
              | "status"
              | "priority_score"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            ModerationReport,
            | "status"
            | "priority_score"
            | "assigned_moderator_id"
            | "assigned_at"
            | "resolved_at"
            | "resolution_action_id"
          >
        >;
        Relationships: [];
      };
      moderation_actions: {
        Row: ModerationAction;
        Insert: Pick<
          ModerationAction,
          | "target_type"
          | "action"
          | "category"
          | "reason_user"
          | "content_snapshot"
        > &
          Partial<
            Pick<
              ModerationAction,
              | "id"
              | "moderator_id"
              | "is_automated"
              | "target_post_id"
              | "target_comment_id"
              | "target_user_id"
              | "target_message_id"
              | "target_listing_id"
              | "target_story_id"
              | "target_job_id"
              | "reason_internal"
              | "legal_basis"
              | "ml_scores"
              | "reports_referenced"
              | "appealable"
              | "appeal_deadline"
              | "created_at"
            >
          >;
        /* Updates bloqués par trigger immutabilité — typage never. */
        Update: never;
        Relationships: [];
      };
      moderation_appeals: {
        Row: ModerationAppeal;
        Insert: Pick<
          ModerationAppeal,
          "action_id" | "appellant_id" | "user_explanation" | "sla_deadline"
        > &
          Partial<
            Pick<
              ModerationAppeal,
              | "id"
              | "additional_evidence_urls"
              | "status"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            ModerationAppeal,
            | "status"
            | "assigned_moderator_id"
            | "resolution_note"
            | "resolution_action_id"
            | "resolved_at"
          >
        >;
        Relationships: [];
      };
      user_sanctions: {
        Row: UserSanction;
        Insert: Pick<UserSanction, "user_id" | "level" | "type" | "reason"> &
          Partial<
            Pick<
              UserSanction,
              | "id"
              | "source_action_id"
              | "starts_at"
              | "expires_at"
              | "is_active"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<UserSanction, "is_active" | "lifted_at" | "lifted_reason">
        >;
        Relationships: [];
      };
      trusted_flaggers: {
        Row: TrustedFlagger;
        Insert: Pick<TrustedFlagger, "contact_email"> &
          Partial<
            Pick<
              TrustedFlagger,
              | "id"
              | "user_id"
              | "organization_name"
              | "expertise_categories"
              | "awarded_by"
              | "awarded_at"
              | "is_active"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            TrustedFlagger,
            | "is_active"
            | "expertise_categories"
            | "reports_submitted"
            | "reports_actioned"
            | "precision_rate"
          >
        >;
        Relationships: [];
      };
      moderation_queue: {
        Row: ModerationQueueItem;
        Insert: Pick<ModerationQueueItem, "job_type" | "payload"> &
          Partial<
            Pick<
              ModerationQueueItem,
              | "id"
              | "priority"
              | "status"
              | "attempts"
              | "max_attempts"
              | "scheduled_for"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            ModerationQueueItem,
            | "status"
            | "attempts"
            | "picked_at"
            | "completed_at"
            | "error_message"
          >
        >;
        Relationships: [];
      };
      moderation_known_hashes: {
        Row: ModerationKnownHash;
        Insert: Pick<ModerationKnownHash, "hash" | "hash_type" | "category"> &
          Partial<
            Pick<
              ModerationKnownHash,
              "id" | "source_action_id" | "added_by" | "is_active" | "created_at"
            >
          >;
        Update: Partial<Pick<ModerationKnownHash, "is_active" | "category">>;
        Relationships: [];
      };
      moderation_text_cache: {
        Row: ModerationTextCacheRow;
        Insert: Pick<
          ModerationTextCacheRow,
          "text_hash" | "scan_result" | "highest_score"
        > &
          Partial<
            Pick<
              ModerationTextCacheRow,
              "detected_categories" | "scanned_at"
            >
          >;
        Update: never;
        Relationships: [];
      };
      moderation_image_cache: {
        Row: ModerationImageCacheRow;
        Insert: Pick<
          ModerationImageCacheRow,
          "image_hash" | "scan_result"
        > &
          Partial<
            Pick<
              ModerationImageCacheRow,
              | "phash"
              | "nsfw_score"
              | "violence_score"
              | "csam_match"
              | "scanned_at"
            >
          >;
        Update: never;
        Relationships: [];
      };
      moderation_critical_incidents: {
        Row: ModerationCriticalIncident;
        Insert: Pick<
          ModerationCriticalIncident,
          | "incident_type"
          | "evidence_storage_path"
          | "evidence_metadata"
          | "detected_by"
        > &
          Partial<
            Pick<
              ModerationCriticalIncident,
              | "id"
              | "perpetrator_user_id"
              | "perpetrator_email"
              | "perpetrator_ip"
              | "status"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            ModerationCriticalIncident,
            | "ncmec_submitted_at"
            | "ncmec_report_id"
            | "pharos_submitted_at"
            | "pharos_reference"
            | "status"
            | "closed_at"
          >
        >;
        Relationships: [];
      };
      legal_data_requests: {
        Row: LegalDataRequest;
        Insert: Pick<
          LegalDataRequest,
          | "request_type"
          | "authority_name"
          | "contact_email"
          | "target_scope"
          | "sla_deadline"
          | "legal_basis"
        > &
          Partial<
            Pick<
              LegalDataRequest,
              | "id"
              | "authority_reference"
              | "target_user_id"
              | "scope_details"
              | "received_at"
              | "status"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            LegalDataRequest,
            | "acknowledged_at"
            | "responded_at"
            | "response_payload_path"
            | "handled_by"
            | "status"
            | "rejection_reason"
          >
        >;
        Relationships: [];
      };
      /* ===== Ads Manager (migration 0048) ===== */
      ads_business_accounts: {
        Row: AdsBusinessAccount;
        Insert: Pick<
          AdsBusinessAccount,
          "legal_name" | "primary_contact_user_id" | "primary_contact_email"
        > &
          Partial<Omit<AdsBusinessAccount, "legal_name" | "primary_contact_user_id" | "primary_contact_email">>;
        Update: Partial<Omit<AdsBusinessAccount, "id" | "created_at">>;
        Relationships: [];
      };
      ad_accounts: {
        Row: AdAccount;
        Insert: Pick<AdAccount, "business_account_id" | "name"> &
          Partial<Omit<AdAccount, "business_account_id" | "name">>;
        Update: Partial<Omit<AdAccount, "id" | "created_at">>;
        Relationships: [];
      };
      ad_account_users: {
        Row: AdAccountUser;
        Insert: Pick<AdAccountUser, "ad_account_id" | "user_id" | "role"> &
          Partial<Pick<AdAccountUser, "granted_by" | "granted_at">>;
        Update: Partial<Pick<AdAccountUser, "role">>;
        Relationships: [];
      };
      advertiser_entities: {
        Row: AdvertiserEntity;
        Insert: Pick<AdvertiserEntity, "ad_account_id" | "type" | "name"> &
          Partial<Omit<AdvertiserEntity, "ad_account_id" | "type" | "name">>;
        Update: Partial<Omit<AdvertiserEntity, "id" | "created_at">>;
        Relationships: [];
      };
      ads_audiences: {
        Row: AdsAudience;
        Insert: Pick<AdsAudience, "ad_account_id" | "name" | "type"> &
          Partial<Omit<AdsAudience, "ad_account_id" | "name" | "type">>;
        Update: Partial<Omit<AdsAudience, "id" | "created_at">>;
        Relationships: [];
      };
      ads_audience_members: {
        Row: AdsAudienceMember;
        Insert: Pick<
          AdsAudienceMember,
          "audience_id" | "identifier_hash" | "identifier_type"
        > &
          Partial<Pick<AdsAudienceMember, "matched_user_id" | "uploaded_at">>;
        Update: never;
        Relationships: [];
      };
      ads_campaigns: {
        Row: AdsCampaign;
        Insert: Pick<AdsCampaign, "ad_account_id" | "name" | "objective"> &
          Partial<Omit<AdsCampaign, "ad_account_id" | "name" | "objective">>;
        Update: Partial<Omit<AdsCampaign, "id" | "ad_account_id" | "created_at">>;
        Relationships: [];
      };
      ads_ad_sets: {
        Row: AdsAdSet;
        Insert: Pick<
          AdsAdSet,
          | "campaign_id"
          | "ad_account_id"
          | "name"
          | "targeting"
          | "optimization_goal"
          | "billing_event"
        > &
          Partial<
            Omit<
              AdsAdSet,
              | "campaign_id"
              | "ad_account_id"
              | "name"
              | "targeting"
              | "optimization_goal"
              | "billing_event"
            >
          >;
        Update: Partial<Omit<AdsAdSet, "id" | "created_at">>;
        Relationships: [];
      };
      ads_creatives: {
        Row: AdsCreative;
        Insert: Pick<
          AdsCreative,
          | "ad_account_id"
          | "type"
          | "primary_text"
          | "headline"
          | "advertiser_entity_id"
        > &
          Partial<
            Omit<
              AdsCreative,
              | "ad_account_id"
              | "type"
              | "primary_text"
              | "headline"
              | "advertiser_entity_id"
            >
          >;
        Update: Partial<Omit<AdsCreative, "id" | "created_at">>;
        Relationships: [];
      };
      ads_ads: {
        Row: AdsAd;
        Insert: Pick<
          AdsAd,
          "ad_set_id" | "ad_account_id" | "campaign_id" | "creative_id" | "name"
        > &
          Partial<
            Omit<
              AdsAd,
              "ad_set_id" | "ad_account_id" | "campaign_id" | "creative_id" | "name"
            >
          >;
        Update: Partial<Omit<AdsAd, "id" | "created_at">>;
        Relationships: [];
      };
      ads_pixels: {
        Row: AdsPixel;
        Insert: Pick<AdsPixel, "ad_account_id" | "name" | "api_token"> &
          Partial<Omit<AdsPixel, "ad_account_id" | "name" | "api_token">>;
        Update: Partial<Omit<AdsPixel, "id" | "created_at">>;
        Relationships: [];
      };
      ads_charges: {
        Row: AdsCharge;
        Insert: Pick<
          AdsCharge,
          "ad_account_id" | "amount" | "currency" | "type"
        > &
          Partial<Omit<AdsCharge, "ad_account_id" | "amount" | "currency" | "type">>;
        Update: Partial<Pick<AdsCharge, "status" | "stripe_charge_id" | "invoice_url">>;
        Relationships: [];
      };
      ad_impressions: {
        Row: AdImpression;
        Insert: Pick<
          AdImpression,
          "ad_id" | "ad_set_id" | "campaign_id" | "ad_account_id" | "surface"
        > &
          Partial<
            Omit<
              AdImpression,
              "ad_id" | "ad_set_id" | "campaign_id" | "ad_account_id" | "surface"
            >
          >;
        Update: never;
        Relationships: [];
      };
      ad_clicks: {
        Row: AdClick;
        Insert: Pick<
          AdClick,
          "ad_id" | "ad_set_id" | "campaign_id" | "ad_account_id"
        > &
          Partial<
            Omit<AdClick, "ad_id" | "ad_set_id" | "campaign_id" | "ad_account_id">
          >;
        Update: Partial<Pick<AdClick, "is_invalid" | "invalid_reason" | "fraud_score">>;
        Relationships: [];
      };
      ad_conversions: {
        Row: AdConversion;
        Insert: Pick<
          AdConversion,
          | "pixel_id"
          | "ad_account_id"
          | "event_id"
          | "event_name"
          | "event_time"
          | "event_source"
        > &
          Partial<
            Omit<
              AdConversion,
              | "pixel_id"
              | "ad_account_id"
              | "event_id"
              | "event_name"
              | "event_time"
              | "event_source"
            >
          >;
        Update: Partial<
          Pick<
            AdConversion,
            "attributed_ad_id"
            | "attributed_click_id"
            | "attribution_model"
            | "attribution_window_days"
            | "fraud_score"
            | "is_invalid"
            | "event_source"
          >
        >;
        Relationships: [];
      };
      ads_library_entries: {
        Row: AdsLibraryEntry;
        Insert: Pick<
          AdsLibraryEntry,
          | "ad_account_id"
          | "business_name"
          | "creative_snapshot"
          | "targeting_summary"
          | "placements"
          | "first_served_at"
        > &
          Partial<
            Omit<
              AdsLibraryEntry,
              | "ad_account_id"
              | "business_name"
              | "creative_snapshot"
              | "targeting_summary"
              | "placements"
              | "first_served_at"
            >
          >;
        Update: Partial<
          Pick<
            AdsLibraryEntry,
            "last_served_at" | "is_active" | "impressions_range" | "spend_range"
          >
        >;
        Relationships: [];
      };
      user_ad_preferences: {
        Row: UserAdPreferences;
        Insert: Pick<UserAdPreferences, "user_id"> &
          Partial<Omit<UserAdPreferences, "user_id">>;
        Update: Partial<Omit<UserAdPreferences, "user_id" | "created_at">>;
        Relationships: [];
      };
      ad_reports: {
        Row: AdReport;
        Insert: Pick<AdReport, "reporter_id" | "category"> &
          Partial<Omit<AdReport, "reporter_id" | "category">>;
        Update: Partial<Pick<AdReport, "status">>;
        Relationships: [];
      };
      /* ===== Ads Manager avancé (migration 0050) ===== */
      ads_website_analyses: {
        Row: AdsWebsiteAnalysis;
        Insert: Pick<AdsWebsiteAnalysis, "url_normalized" | "url_original"> &
          Partial<Omit<AdsWebsiteAnalysis, "url_normalized" | "url_original">>;
        Update: Partial<Omit<AdsWebsiteAnalysis, "id" | "created_at">>;
        Relationships: [];
      };
      ads_keyword_research: {
        Row: AdsKeywordResearch;
        Insert: Pick<AdsKeywordResearch, "keyword" | "country" | "language"> &
          Partial<Omit<AdsKeywordResearch, "keyword" | "country" | "language">>;
        Update: Partial<Omit<AdsKeywordResearch, "id" | "fetched_at">>;
        Relationships: [];
      };
      ads_lead_forms: {
        Row: AdsLeadForm;
        Insert: Pick<
          AdsLeadForm,
          "ad_account_id" | "name" | "intro_title" | "privacy_policy_url"
        > &
          Partial<
            Omit<
              AdsLeadForm,
              "ad_account_id" | "name" | "intro_title" | "privacy_policy_url"
            >
          >;
        Update: Partial<Omit<AdsLeadForm, "id" | "ad_account_id" | "created_at">>;
        Relationships: [];
      };
      ads_lead_form_responses: {
        Row: AdsLeadFormResponse;
        Insert: Pick<
          AdsLeadFormResponse,
          "lead_form_id" | "ad_account_id" | "answers"
        > &
          Partial<
            Omit<
              AdsLeadFormResponse,
              "lead_form_id" | "ad_account_id" | "answers"
            >
          >;
        Update: Partial<
          Pick<
            AdsLeadFormResponse,
            "webhook_delivered_at" | "webhook_response_code" | "webhook_attempts"
          >
        >;
        Relationships: [];
      };
      ads_dynamic_creative_variants: {
        Row: AdsDynamicCreativeVariant;
        Insert: Pick<
          AdsDynamicCreativeVariant,
          "parent_creative_id" | "variant_type"
        > &
          Partial<
            Omit<AdsDynamicCreativeVariant, "parent_creative_id" | "variant_type">
          >;
        Update: Partial<
          Pick<
            AdsDynamicCreativeVariant,
            | "total_impressions"
            | "total_clicks"
            | "total_conversions"
            | "performance_score"
            | "is_winner"
          >
        >;
        Relationships: [];
      };
      ads_custom_conversions: {
        Row: AdsCustomConversion;
        Insert: Pick<
          AdsCustomConversion,
          "ad_account_id" | "name" | "filter_spec" | "category"
        > &
          Partial<
            Omit<
              AdsCustomConversion,
              "ad_account_id" | "name" | "filter_spec" | "category"
            >
          >;
        Update: Partial<
          Omit<AdsCustomConversion, "id" | "ad_account_id" | "created_at">
        >;
        Relationships: [];
      };
      ads_offline_conversions: {
        Row: AdsOfflineConversion;
        Insert: Pick<
          AdsOfflineConversion,
          "ad_account_id" | "batch_id" | "event_name" | "event_time"
        > &
          Partial<
            Omit<
              AdsOfflineConversion,
              "ad_account_id" | "batch_id" | "event_name" | "event_time"
            >
          >;
        Update: Partial<
          Pick<
            AdsOfflineConversion,
            | "match_status"
            | "matched_user_id"
            | "attributed_ad_id"
            | "attributed_click_id"
            | "attribution_model"
            | "matched_at"
          >
        >;
        Relationships: [];
      };
      ads_recommendations: {
        Row: AdsRecommendation;
        Insert: Pick<
          AdsRecommendation,
          "ad_account_id" | "type" | "title" | "description"
        > &
          Partial<
            Omit<
              AdsRecommendation,
              "ad_account_id" | "type" | "title" | "description"
            >
          >;
        Update: Partial<
          Pick<
            AdsRecommendation,
            | "status"
            | "applied_at"
            | "applied_by"
            | "dismissed_at"
            | "dismissed_by"
          >
        >;
        Relationships: [];
      };
      ads_smart_audience_segments: {
        Row: AdsSmartAudienceSegment;
        Insert: Pick<
          AdsSmartAudienceSegment,
          "persona_name" | "targeting_spec"
        > &
          Partial<Omit<AdsSmartAudienceSegment, "persona_name" | "targeting_spec">>;
        Update: Partial<
          Pick<
            AdsSmartAudienceSegment,
            "ai_ranking" | "confidence_score" | "estimated_size"
          >
        >;
        Relationships: [];
      };
    };
    Views: {
      /* Vue matérialisée — migration 0043_post_engagement_stats.sql.
         Refresh CONCURRENTLY toutes les 5 min via cron (cf CRON_SETUP.md).
         Utilisée par lib/recsys/ranker.ts pour le signal "trending". */
      post_engagement_stats: {
        Row: {
          post_id: string;
          author_id: string;
          created_at: string;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          engagement_score: number;
          age_hours: number;
          hourly_velocity: number;
        };
        Relationships: [];
      };
      /* Vue d'agrégation des badges quiz — migration 0026_pro_features.sql.
         Best score + last attempt par (user, quiz). */
      user_skill_badges: {
        Row: {
          user_id: string;
          quiz_id: string;
          skill_name: string;
          slug: string;
          title: string;
          best_score: number;
          total: number;
          passed: boolean;
          last_attempt_at: string;
        };
        Relationships: [];
      };
      /* Chantier 6 (migration 0088) — Agrégat DAC7 par seller/année. */
      dac7_seller_yearly_revenue: {
        Row: {
          seller_id: string;
          year: number;
          total_orders: number;
          total_revenue_eur: number;
          has_dac7_threshold: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_listing_offer: {
        Args: { offer_id: string };
        Returns: void;
      };
      get_notification_preferences: {
        Args: Record<string, never>;
        Returns: UserNotificationPreferences;
      };
      mark_reel_notifications_read: {
        Args: { reel_id: string };
        Returns: void;
      };
      mark_post_notifications_read: {
        Args: { post_id: string };
        Returns: void;
      };
      should_notify_user: {
        Args: { target_user_id: string; notif_type: string };
        Returns: boolean;
      };
      enqueue_reel_fingerprint: {
        Args: { p_reel_id: string; p_hash: string };
        Returns: void;
      };
      refresh_my_completion_score: {
        Args: Record<string, never>;
        Returns: number;
      };
      compute_profile_completion_score: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_user_highlights_with_items: {
        Args: { p_user_id: string };
        Returns: Array<{
          highlight_id: string;
          title: string;
          cover_image_url: string;
          sort_position: number;
          items_count: number;
          story_ids: string[];
        }>;
      };
      toggle_recommendation_visibility: {
        Args: { p_reco_id: string; p_visible: boolean };
        Returns: void;
      };
      count_user_recommendations: {
        Args: { p_user_id: string };
        Returns: { received_count: number; given_count: number };
      };
      toggle_follow: {
        Args: { p_followed_id: string };
        Returns: boolean;
      };
      is_following: {
        Args: { p_follower_id: string; p_followed_id: string };
        Returns: boolean;
      };
      get_mutual_followers: {
        Args: {
          p_user_a: string;
          p_user_b: string;
          p_limit?: number;
        };
        Returns: MutualFollower[];
      };
      toggle_close_friend: {
        Args: { p_close_friend_id: string };
        Returns: boolean;
      };
      toggle_badge_visibility: {
        Args: { p_badge_id: string; p_visible: boolean };
        Returns: void;
      };
      upsert_draft_profile: {
        Args: { p_payload: Record<string, unknown>; p_current_section?: string };
        Returns: number;
      };
      clear_draft_profile: {
        Args: Record<string, never>;
        Returns: void;
      };
      admin_approve_verification: {
        Args: { p_request_id: string; p_notes?: string };
        Returns: void;
      };
      admin_reject_verification: {
        Args: { p_request_id: string; p_notes: string };
        Returns: void;
      };
      request_account_deletion: {
        Args: Record<string, never>;
        Returns: string;
      };
      cancel_account_deletion: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_payout_request: {
        Args: {
          amount_cents: number;
          currency_code: string;
          iban_value: string;
          bic_value: string | null;
          holder: string;
        };
        Returns: string;
      };
      cancel_payout_request: {
        Args: { request_id: string };
        Returns: void;
      };
      find_similar_posts_to_user: {
        Args: { target_user_id: string; result_limit?: number };
        Returns: Array<{ post_id: string; similarity_score: number }>;
      };
      /* Migration 0118 — Chantier Reels Recsys 4. */
      find_similar_reels_to_user: {
        Args: { target_user_id: string; result_limit?: number };
        Returns: Array<{ reel_id: string; similarity_score: number }>;
      };
      /* Migration 0119 — Chantier Reels Recsys 7. Candidate generation
       * multi-source pour le For You Page (étape 7 squelette, sources
       * complètes étapes 8 + 9). */
      generate_candidates_v3: {
        Args: {
          p_user_id: string;
          p_surface?:
            | "feed_foryou"
            | "feed_home"
            | "reels_foryou"
            | "reels";
          p_n?: number;
        };
        Returns: Array<{
          content_id: string;
          content_type: "post" | "reel";
          source:
            | "network"
            | "similar_content"
            | "creator_revisit"
            | "exploration"
            | "collaborative"
            | "trending"
            | "fresh_creators";
          source_score: number;
          source_metadata: Record<string, unknown>;
        }>;
      };
      refresh_post_engagement_stats: {
        Args: Record<string, never>;
        Returns: void;
      };
      compute_report_priority_score: {
        Args: {
          p_category: string;
          p_reporter_id: string;
          p_target_user_id: string | null;
          p_target_post_id: string | null;
        };
        Returns: number;
      };
      recalculate_trust_score: {
        Args: { p_user_id: string };
        Returns: number;
      };
      apply_sanction: {
        Args: {
          p_user_id: string;
          p_level: number;
          p_reason: string;
          p_source_action_id?: string | null;
        };
        Returns: string;
      };
      is_user_under_active_sanction: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      current_user_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      user_has_ad_account_role: {
        Args: { p_ad_account_id: string; p_min_role?: string };
        Returns: boolean;
      };
      normalize_url: {
        Args: { p_url: string };
        Returns: string;
      };
      apply_recommendation: {
        Args: { p_recommendation_id: string };
        Returns: boolean;
      };
      dismiss_recommendation: {
        Args: { p_recommendation_id: string };
        Returns: boolean;
      };
      get_or_create_direct_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
      /* Migration 0089 — conv dédiée à un listing marketplace. */
      get_or_create_listing_conversation: {
        Args: { p_listing_id: string };
        Returns: string;
      };
      /* Migration 0104 — bump compteur ambassadeur après accept invitation. */
      bump_ambassador_count: {
        Args: { p_inviter_user_id: string; p_circle_id: string };
        Returns: void;
      };
      /* Migration 0105 — recalcul cron vitality_score + counters dénormalisés. */
      refresh_all_circles_vitality: {
        Args: Record<string, never>;
        Returns: Array<{
          circle_id: string;
          vitality_score: number;
          posts_count_7d: number;
          active_members_count_7d: number;
          new_members_count_7d: number;
          new_members_count_30d: number;
        }>;
      };
      /* Migration 0106 — stats agrégées d'un cercle sur 7j (digest hebdo). */
      circle_weekly_stats: {
        Args: { p_circle_id: string };
        Returns: Record<string, unknown>;
      };
      /* Migration 0106 — insert notification digest idempotent. */
      enqueue_circle_weekly_digest: {
        Args: {
          p_circle_id: string;
          p_user_id: string;
          p_title: string;
          p_body: string;
          p_href: string;
        };
        Returns: boolean;
      };
      /* Migration 0107 — seeder bootstrap 20 cercles. */
      seed_bootstrap_circles: {
        Args: { p_owner_id: string };
        Returns: Array<{ slug: string; created: boolean }>;
      };
      /* Migration 0111 — toggle reaction sur post (6 types). */
      toggle_post_reaction: {
        Args: {
          p_post_id: string;
          p_reaction_type:
            | "heart"
            | "applause"
            | "insightful"
            | "surprised"
            | "sad"
            | "laugh";
        };
        Returns: boolean;
      };
      /* Migration 0112 — Collections v2 : partage, organisation, lecture. */
      share_collection: {
        Args: { p_collection_id: string; p_desired_slug?: string | null };
        Returns: string;
      };
      organize_bookmark: {
        Args: {
          p_post_id: string;
          p_collection_id?: string | null;
          p_reading_state?: "to_read" | "reading" | "done" | null;
          p_note?: string | null;
        };
        Returns: void;
      };
      touch_bookmark: {
        Args: { p_post_id: string };
        Returns: void;
      };
      /* Migration 0113 — Polls v2 : upsert atomique + fermeture. */
      vote_poll: {
        Args: { p_poll_id: string; p_option_ids: string[] };
        Returns: string[];
      };
      close_poll: {
        Args: { p_poll_id: string };
        Returns: void;
      };
      recompute_poll_counts: {
        Args: { p_poll_id: string };
        Returns: void;
      };
      /* Migration 0114 — Feed v2 : 4 modes transparents en SQL pur. */
      feed_v2: {
        Args: {
          p_mode?: FeedMode;
          p_user_id?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          post_id: string;
          score: number | null;
          reason: string | null;
        }>;
      };
      /* Migration 0116 — Découverte explicable (3 sources mixées). */
      discover_posts: {
        Args: { p_user_id?: string | null; p_limit?: number };
        Returns: Array<{
          post_id: string;
          score: number | null;
          reason_type: DiscoverReasonType;
          reason_data: Record<string, number>;
        }>;
      };
      /* Migration 0093 — toggle vote sur post de cercle (upvote/downvote/helpful).
       * Retourne true si vote ajouté, false si vote retiré. */
      toggle_circle_post_vote: {
        Args: {
          p_post_id: string;
          p_vote_type: "upvote" | "downvote" | "helpful";
        };
        Returns: boolean;
      };
      /* Migration 0094 — discovery cercles avec score transparent. */
      discover_circles_v2: {
        Args: {
          p_category?: string | null;
          p_query?: string | null;
          p_country?: string | null;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{
          id: string;
          score: number;
          breakdown: Record<string, unknown>;
        }>;
      };
      /* Migration 0095 — recommandations personnalisées avec reasons[]. */
      recommend_circles_for_user: {
        Args: {
          p_user_id: string;
          p_limit?: number;
        };
        Returns: Array<{
          id: string;
          score: number;
          reasons: string[] | null;
        }>;
      };
      /* Migration 0090 — notification in-app sur réponse à offre. */
      notify_marketplace_offer_event: {
        Args: {
          p_offer_id: string;
          p_type:
            | "marketplace_offer_received"
            | "marketplace_offer_accepted"
            | "marketplace_offer_declined"
            | "marketplace_offer_countered"
            | "marketplace_offer_withdrawn";
          p_title: string;
          p_body?: string | null;
          p_href?: string | null;
        };
        Returns: string;
      };
      mark_conversation_read: {
        Args: { conv_id: string };
        Returns: void;
      };
      is_conversation_member: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      /* Chantier 1 (migration 0073) — messagerie étendue. */
      mark_view_once_viewed: {
        Args: { p_message_id: string };
        Returns: void;
      };
      flag_screenshot_detected: {
        Args: { p_message_id: string };
        Returns: void;
      };
      toggle_conversation_pin: {
        Args: { p_conv_id: string };
        Returns: boolean;
      };
      toggle_conversation_archive: {
        Args: { p_conv_id: string };
        Returns: boolean;
      };
      set_conversation_mute: {
        Args: { p_conv_id: string; p_muted: boolean; p_until?: string };
        Returns: void;
      };
      get_or_create_self_conversation: {
        Args: Record<string, never>;
        Returns: string;
      };
      /* Chantier 1.6 (migration 0075) — auto-delete. */
      set_conversation_auto_delete: {
        Args: { p_conv_id: string; p_days: number | null };
        Returns: void;
      };
      purge_expired_messages: {
        Args: Record<string, never>;
        Returns: number;
      };
      /* Chantier 2.1 (migration 0076) — appels P2P. */
      create_call_session: {
        Args: { p_conversation_id: string; p_kind?: "audio" | "video" };
        Returns: string;
      };
      end_call_session: {
        Args: {
          p_call_id: string;
          p_status: "ended" | "missed" | "rejected" | "failed";
          p_reason?: string;
        };
        Returns: void;
      };
      mark_call_connected: {
        Args: { p_call_id: string };
        Returns: void;
      };
      /* Migration 0082 — set description d'un groupe. */
      set_group_description: {
        Args: { p_conv_id: string; p_description: string };
        Returns: void;
      };
      /* Migration 0081 — bypass RLS pour push notifs messagerie. */
      get_push_subs_for_users: {
        Args: { p_user_ids: string[] };
        Returns: Array<{
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        }>;
      };
      /* Chantier 3 (migration 0077) — thèmes per-conv. */
      set_conversation_theme: {
        Args: {
          p_conv_id: string;
          p_theme_preset: string;
          p_wallpaper_id: string;
        };
        Returns: void;
      };
      /* Signal Protocol (migration 0074). */
      consume_one_time_prekey: {
        Args: { p_target_user_id: string };
        Returns: { prekey_id: number; public_key: string } | null;
      };
      get_prekey_bundle: {
        Args: { p_target_user_id: string };
        Returns: SignalPreKeyBundle;
      };
      count_my_available_otpk: {
        Args: Record<string, never>;
        Returns: number;
      };
      mark_safety_verified: {
        Args: { p_other_user_id: string };
        Returns: void;
      };
      send_friend_request: {
        Args: { recipient_user_id: string; intro?: string | null };
        Returns: string;
      };
      are_friends: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      can_moderate_circle: {
        Args: { p_circle_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_circle_member: {
        Args: { p_circle_id: string; p_user_id: string };
        Returns: boolean;
      };
      preview_circle_invitation: {
        Args: { p_token: string };
        Returns: CircleInvitationPreview[];
      };
      accept_circle_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: void;
      };
      mark_conversation_notifications_read: {
        Args: { conv_id: string };
        Returns: void;
      };
      transfer_money: {
        Args: {
          recipient_user_id: string;
          transfer_amount: number;
          transfer_currency: Currency;
          transfer_description?: string | null;
        };
        Returns: string;
      };
      create_group_conversation: {
        Args: {
          group_name: string;
          member_ids: string[];
          group_avatar_url?: string | null;
        };
        Returns: string;
      };
      add_group_member: {
        Args: { conv_id: string; new_member_id: string };
        Returns: void;
      };
      remove_group_member: {
        Args: { conv_id: string; target_user_id: string };
        Returns: void;
      };
      update_group_info: {
        Args: {
          conv_id: string;
          new_name?: string | null;
          new_avatar_url?: string | null;
        };
        Returns: void;
      };
      is_current_user_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_stats: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      admin_recent_users: {
        Args: { items_limit?: number };
        Returns: Array<{
          id: string;
          email: string | null;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          founder_rank: number | null;
          is_admin: boolean;
          onboarded_at: string | null;
          created_at: string;
        }>;
      };
      rank_feed_posts: {
        Args: { feed_limit?: number };
        Returns: Array<{
          id: string;
          author_id: string;
          body: string | null;
          visibility: string;
          created_at: string;
          likes_count: number;
          comments_count: number;
          is_friend: boolean;
          is_viewed: boolean;
          is_liked: boolean;
          score: number;
        }>;
      };
      record_post_view: {
        Args: { target_post_id: string };
        Returns: void;
      };
      update_my_presence: {
        Args: { new_status: PresenceStatus };
        Returns: void;
      };
      get_visible_presence: {
        Args: { target_user_id: string };
        Returns: Array<{
          user_id: string;
          presence_status: PresenceStatus;
          last_seen_at: string | null;
          custom_status: CustomStatus;
        }>;
      };
      get_visible_presence_batch: {
        Args: { target_user_ids: string[] };
        Returns: Array<{
          user_id: string;
          presence_status: PresenceStatus;
          last_seen_at: string | null;
          custom_status: CustomStatus;
        }>;
      };
      expire_stale_presence: {
        Args: Record<string, never>;
        Returns: number;
      };
      record_profile_view: {
        Args: { target_user_id: string };
        Returns: void;
      };
      posts_by_hashtag: {
        Args: { tag_text: string; page_limit?: number };
        Returns: Array<{
          id: string;
          author_id: string;
          body: string | null;
          visibility: PostVisibility;
          created_at: string;
          likes_count: number;
          comments_count: number;
        }>;
      };
      are_pro_connected: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      connection_degree: {
        Args: { target_user_id: string };
        Returns: number | null;
      };
      send_pro_connection: {
        Args: {
          recipient_user_id: string;
          context_value?: string | null;
          intro_value?: string | null;
        };
        Returns: string;
      };
      /* Chantier 2.4 — Postgres FTS sur listings. */
      search_listings_fts: {
        Args: {
          p_query: string;
          p_categories?: string[] | null;
          p_conditions?: string[] | null;
          p_price_min?: number | null;
          p_price_max?: number | null;
          p_status?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Array<{ id: string; rank: number }>;
      };
      /* Chantier 2.5 — Recommandations personnalisées marketplace. */
      recommended_listings_for_user: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Array<{ id: string; score: number }>;
      };
      /* Chantier 6 — Soumission de review post-transaction. */
      submit_marketplace_review: {
        Args: {
          p_order_id: string;
          p_rating: number;
          p_body?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const LOCALE_LABELS: Record<Locale, string> = {
  "fr-FR": "Français · France",
  "fr-CA": "Français · Canada",
  "fr-BE": "Français · Belgique",
  "fr-CH": "Français · Suisse",
  "fr-MA": "Français · Maroc",
  "fr-SN": "Français · Sénégal",
  "fr-CI": "Français · Côte d'Ivoire",
  "fr-CM": "Français · Cameroun",
  "fr-DZ": "Français · Algérie",
  "fr-TN": "Français · Tunisie",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  EUR: "Euro (€) · UE",
  XAF: "Franc CFA BEAC · Afrique centrale",
  XOF: "Franc CFA BCEAO · Afrique de l'Ouest",
  MAD: "Dirham · Maroc",
  TND: "Dinar · Tunisie",
  DZD: "Dinar · Algérie",
  CAD: "Dollar canadien · Canada",
  CHF: "Franc suisse · Suisse",
};

export const THEME_LABELS: Record<Theme, string> = {
  light: "Clair",
  dark: "Sombre",
  system: "Suivre le système",
};

export const CUSTOM_STATUS_LABELS: Record<CustomStatus, string> = {
  available: "Disponible",
  busy: "Occupé",
  dnd: "Ne pas déranger",
  invisible: "Invisible",
};

export const PRESENCE_VISIBILITY_LABELS: Record<PresenceVisibility, string> = {
  everyone: "Tout le monde",
  friends: "Mes amis seulement",
  nobody: "Personne (réciprocité : tu ne vois pas non plus)",
};
