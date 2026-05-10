"use client";

import {
  AtSign,
  Bell,
  Heart,
  MessageCircle,
  MessageSquareText,
  Shield,
  UserPlus,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  updateNotificationPreferences,
  type NotificationPrefsState,
} from "./actions";

type Prefs = {
  friend_requests: boolean;
  messages: boolean;
  mentions: boolean;
  likes: boolean;
  comments: boolean;
  moderation: boolean;
  system: boolean;
};

type Category = {
  key: keyof Prefs;
  label: string;
  description: string;
  icon: typeof Bell;
};

const CATEGORIES: Category[] = [
  {
    key: "friend_requests",
    label: "Demandes d'amis",
    description: "Demande reçue, acceptée, refusée",
    icon: UserPlus,
  },
  {
    key: "messages",
    label: "Messages",
    description: "Nouveau message dans une conversation",
    icon: MessageSquareText,
  },
  {
    key: "mentions",
    label: "Mentions",
    description: "Quand on te mentionne dans un post ou un reel",
    icon: AtSign,
  },
  {
    key: "likes",
    label: "J'aime",
    description: "Likes sur tes posts, reels et commentaires",
    icon: Heart,
  },
  {
    key: "comments",
    label: "Commentaires & réponses",
    description: "Commentaires sur tes contenus + réponses à tes commentaires",
    icon: MessageCircle,
  },
  {
    key: "moderation",
    label: "Modération",
    description: "Décisions, signalements, appels",
    icon: Shield,
  },
  {
    key: "system",
    label: "Système",
    description: "Annonces DIVARC, fonctionnalités importantes",
    icon: Bell,
  },
];

const INITIAL_STATE: NotificationPrefsState = { status: "idle" };

type Props = {
  initialPrefs: Prefs;
};

export function NotificationPrefsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferences,
    INITIAL_STATE,
  );

  /* Toast feedback : useActionState ne ré-affiche pas par défaut. */
  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Préférences enregistrées.");
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  function toggle(key: keyof Prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <form action={formAction} className="space-y-3">
      {CATEGORIES.map(({ key, label, description, icon: Icon }) => (
        <label
          key={key}
          className={cn(
            "flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border border-line cursor-pointer transition-colors",
            prefs[key] ? "hover:border-gold-deep/40" : "opacity-70 hover:opacity-100",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              prefs[key]
                ? "bg-gold/15 text-gold-deep"
                : "bg-night/5 text-night-muted",
            )}
          >
            <Icon className="w-5 h-5" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-night">{label}</p>
            <p className="text-[12px] text-night-muted">{description}</p>
          </div>
          <input
            type="checkbox"
            name={key}
            checked={prefs[key]}
            onChange={() => toggle(key)}
            className="sr-only peer"
          />
          <span
            aria-hidden
            className={cn(
              "relative inline-block w-11 h-6 rounded-full transition-colors shrink-0",
              prefs[key] ? "bg-gold-deep" : "bg-night/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                prefs[key] ? "translate-x-5" : "translate-x-0",
              )}
            />
          </span>
        </label>
      ))}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full mt-6 px-4 py-3 rounded-full text-[14px] font-semibold transition-colors",
          pending
            ? "bg-night/10 text-night-muted cursor-wait"
            : "bg-night text-cream hover:bg-night-soft",
        )}
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
