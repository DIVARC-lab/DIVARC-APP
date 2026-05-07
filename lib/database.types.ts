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
