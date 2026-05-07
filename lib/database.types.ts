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
  created_at: string;
  updated_at: string;
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

export type PostWithDetails = Post & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  photos: PostPhoto[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
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

export type Story = {
  id: string;
  author_id: string;
  type: StoryType;
  photo_url: string | null;
  caption: string | null;
  background: string | null;
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

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  type: MessageType;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
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
    body: string;
    sender_id: string;
    created_at: string;
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
        Insert: Omit<Message, "id" | "created_at" | "edited_at" | "deleted_at" | "type"> &
          Partial<Pick<Message, "id" | "type">>;
        Update: Partial<Pick<Message, "body" | "edited_at" | "deleted_at">>;
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
        Insert: Omit<Post, "id" | "created_at" | "updated_at" | "edited_at" | "deleted_at"> &
          Partial<Pick<Post, "id" | "edited_at" | "deleted_at">>;
        Update: Partial<Pick<Post, "body" | "visibility" | "edited_at" | "deleted_at">>;
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
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at" | "updated_at" | "closed_at"> &
          Partial<Pick<Job, "id" | "status" | "closed_at">>;
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
