"use client";

/* Bottom sheet 'Plus' qui regroupe les actions admin du live.
 * Remplace la barre d'options permanente par un menu compact. */

import { Hand, MessageSquare, Target, Vote, X } from "lucide-react";

type Action = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  badge?: number;
  tone?: "default" | "gold";
};

type Props = {
  open: boolean;
  onClose: () => void;
  pendingRequestsCount: number;
  onOpenStage: () => void;
  onOpenChat: () => void;
  onOpenPoll: () => void;
  onOpenGoal: () => void;
};

export function HostOptionsMenu({
  open,
  onClose,
  pendingRequestsCount,
  onOpenStage,
  onOpenChat,
  onOpenPoll,
  onOpenGoal,
}: Props) {
  if (!open) return null;

  const actions: Action[] = [
    {
      id: "stage",
      icon: <Hand className="w-4 h-4" aria-hidden strokeWidth={2.4} />,
      label: "Demandes",
      description: pendingRequestsCount
        ? `${pendingRequestsCount} en attente`
        : "Gérer les demandes de prise de parole",
      onClick: () => {
        onClose();
        onOpenStage();
      },
      badge: pendingRequestsCount,
      tone: pendingRequestsCount > 0 ? "gold" : "default",
    },
    {
      id: "chat",
      icon: <MessageSquare className="w-4 h-4" aria-hidden strokeWidth={2.4} />,
      label: "Chat",
      description: "Modérer, épingler, supprimer des commentaires",
      onClick: () => {
        onClose();
        onOpenChat();
      },
    },
    {
      id: "poll",
      icon: <Vote className="w-4 h-4" aria-hidden strokeWidth={2.4} />,
      label: "Sondage",
      description: "Lance un vote en direct",
      onClick: () => {
        onClose();
        onOpenPoll();
      },
    },
    {
      id: "goal",
      icon: <Target className="w-4 h-4" aria-hidden strokeWidth={2.4} />,
      label: "Objectif",
      description: "Fixe un objectif de revenus, viewers ou cadeaux",
      onClick: () => {
        onClose();
        onOpenGoal();
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-night text-cream border-t-2 border-gold/30 shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex items-center justify-between p-5 border-b border-cream/10">
          <h2 className="font-display italic text-[18px] text-cream">
            Options <em className="text-gold">live</em>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <ul className="p-3 space-y-1.5">
          {actions.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={a.onClick}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors active:scale-[0.98] ${
                  a.tone === "gold"
                    ? "bg-gold/15 border border-gold/30 hover:bg-gold/25"
                    : "bg-cream/5 hover:bg-cream/10 border border-cream/10"
                }`}
              >
                <span
                  className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                    a.tone === "gold"
                      ? "bg-gold text-night"
                      : "bg-cream/15 text-cream"
                  }`}
                >
                  {a.icon}
                  {typeof a.badge === "number" && a.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold ring-2 ring-night">
                      {a.badge > 9 ? "9+" : a.badge}
                    </span>
                  ) : null}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-extrabold text-cream truncate">
                    {a.label}
                  </p>
                  <p className="text-[11px] text-cream/60 truncate">
                    {a.description}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
