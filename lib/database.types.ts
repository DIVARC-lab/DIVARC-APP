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
  created_at: string;
  updated_at: string;
};

export type ProfileIdentityUpdate = Partial<
  Pick<Profile, "username" | "full_name" | "bio" | "location" | "avatar_url">
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
