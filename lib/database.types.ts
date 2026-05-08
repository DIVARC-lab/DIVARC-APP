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
  >
>;

export type ProfileUpdate = ProfileIdentityUpdate & ProfilePreferencesUpdate;

export type ConversationType = "direct" | "group";
export type MemberRole = "owner" | "member";
export type MessageType = "text" | "system";
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
  | "system";

export type PostVisibility = "public" | "friends" | "private";

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
  circle_id: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type PostPhoto = {
  id: string;
  post_id: string;
  url: string;
  position: number;
  created_at: string;
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

export type PostCollection = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  is_private: boolean;
  bookmarks_count: number;
  position_order: number;
  created_at: string;
};

export type PostBookmark = {
  user_id: string;
  post_id: string;
  collection_id: string | null;
  created_at: string;
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

export type PostWithDetails = Post & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  photos: PostPhoto[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
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

export type StoryType = "photo" | "text";

export type StoryFilter =
  | "original"
  | "dore"
  | "creme"
  | "nuit"
  | "pellicule"
  | "argent";

export type Story = {
  id: string;
  author_id: string;
  type: StoryType;
  photo_url: string | null;
  caption: string | null;
  background: string | null;
  filter: StoryFilter | null;
  created_at: string;
  expires_at: string;
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

export type CircleColor =
  | "gold"
  | "navy"
  | "emerald"
  | "rose"
  | "violet"
  | "cream";

export type CircleRole = "admin" | "mod" | "member";

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
};

export type CircleMember = {
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
};

export type CircleWithMembership = Circle & {
  is_member: boolean;
  my_role: CircleRole | null;
};

export type CircleMemberWithProfile = CircleMember & {
  profile: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

export type CircleEventCategory = "community" | "social" | "cultural";

export type CircleEventAttendanceStatus = "going" | "interested";

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
  created_at: string;
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

export type ListingStatus = "draft" | "active" | "sold" | "archived";
export type ListingCondition = "new" | "like_new" | "used" | "fair";
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
};

export type ListingPhoto = {
  id: string;
  listing_id: string;
  url: string;
  position: number;
  created_at: string;
};

export type Favorite = {
  user_id: string;
  listing_id: string;
  created_at: string;
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
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
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
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  role: MemberRole;
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
  } | null;
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
            >
          >;
        Update: Partial<Pick<Message, "body" | "edited_at" | "deleted_at">>;
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
        Insert: Omit<Notification, "id" | "created_at" | "read_at"> &
          Partial<Pick<Notification, "id" | "created_at" | "read_at">>;
        Update: Partial<Pick<Notification, "read_at">>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: Omit<Listing, "id" | "created_at" | "updated_at" | "sold_at"> &
          Partial<Pick<Listing, "id" | "status" | "sold_at">>;
        Update: Partial<
          Pick<
            Listing,
            | "title"
            | "description"
            | "price_amount"
            | "price_currency"
            | "category"
            | "condition"
            | "location"
            | "status"
            | "sold_at"
          >
        >;
        Relationships: [];
      };
      listing_photos: {
        Row: ListingPhoto;
        Insert: Omit<ListingPhoto, "id" | "created_at"> &
          Partial<Pick<ListingPhoto, "id" | "created_at">>;
        Update: Partial<Pick<ListingPhoto, "url" | "position">>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Pick<Favorite, "user_id" | "listing_id">;
        Update: never;
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
              | "circle_id"
              | "edited_at"
              | "deleted_at"
            >
          >;
        Update: Partial<
          Pick<Post, "body" | "visibility" | "circle_id" | "edited_at" | "deleted_at">
        >;
        Relationships: [];
      };
      post_photos: {
        Row: PostPhoto;
        Insert: Omit<PostPhoto, "id" | "created_at"> &
          Partial<Pick<PostPhoto, "id" | "created_at">>;
        Update: Partial<Pick<PostPhoto, "url" | "position">>;
        Relationships: [];
      };
      post_likes: {
        Row: PostLike;
        Insert: Pick<PostLike, "post_id" | "user_id">;
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
            >
          >;
        Update: Partial<
          Pick<PostCollection, "name" | "emoji" | "is_private" | "position_order">
        >;
        Relationships: [];
      };
      post_bookmarks: {
        Row: PostBookmark;
        Insert: Pick<PostBookmark, "user_id" | "post_id"> &
          Partial<Pick<PostBookmark, "collection_id" | "created_at">>;
        Update: Partial<Pick<PostBookmark, "collection_id">>;
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
        Insert: Omit<Story, "id" | "created_at" | "expires_at"> &
          Partial<Pick<Story, "id" | "expires_at">>;
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
        Insert: Pick<Circle, "slug" | "name" | "owner_id"> &
          Partial<
            Pick<
              Circle,
              | "id"
              | "description"
              | "emoji"
              | "color"
              | "is_private"
              | "members_count"
              | "created_at"
            >
          >;
        Update: Partial<
          Pick<
            Circle,
            "name" | "description" | "emoji" | "color" | "is_private"
          >
        >;
        Relationships: [];
      };
      circle_members: {
        Row: CircleMember;
        Insert: Pick<CircleMember, "circle_id" | "user_id"> &
          Partial<Pick<CircleMember, "role" | "joined_at">>;
        Update: Partial<Pick<CircleMember, "role">>;
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
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_direct_conversation: {
        Args: { other_user_id: string };
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
      send_friend_request: {
        Args: { recipient_user_id: string; intro?: string | null };
        Returns: string;
      };
      are_friends: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
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
