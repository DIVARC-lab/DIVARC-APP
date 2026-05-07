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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & ProfileUpdate;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
