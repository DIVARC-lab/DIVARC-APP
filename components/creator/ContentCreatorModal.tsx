"use client";

import { motion, AnimatePresence, type PanInfo } from "motion/react";
import {
  Briefcase,
  CalendarDays,
  ImageIcon,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { cn } from "@/lib/utils/cn";
import {
  type CreatorMode,
  useCreator,
} from "./CreatorProvider";

/* Catalogue des modes — métadonnées affichées dans les tabs/header.
 * Les contenus internes (formulaires) sont rendus via les composants Mode*
 * pluggés à partir de l'étape 4. */
const MODE_META: Record<
  CreatorMode,
  {
    label: string;
    icon: typeof Sparkles;
    /** Story passe en plein écran sombre (override du layout standard). */
    fullscreenDark?: boolean;
  }
> = {
  post: { label: "Post", icon: Sparkles },
  story: { label: "Story", icon: ImageIcon, fullscreenDark: true },
  listing: { label: "À vendre", icon: ShoppingBag },
  job: { label: "Offre", icon: Briefcase },
  event: { label: "Événement", icon: CalendarDays },
};

const ALL_MODES: CreatorMode[] = ["post", "story", "listing", "job", "event"];

/* Shell modal universel pour ContentCreator. Layout responsive :
 *  - Desktop (lg+) : modal centré max-w-3xl max-h-[90vh] radius 20
 *  - Tablet (sm-lg) : modal centré 90% width
 *  - Mobile (<sm) : bottom sheet 100% width 95vh avec drag-handle
 *
 * Mode story : plein écran fond noir sur tous les viewports (style
 * Instagram/Snapchat).
 *
 * Animation via `motion` (Framer Motion fork léger, déjà installé).
 * Spring damping 30 stiffness 300 ~ 250ms perçus.
 *
 * Fermeture : Escape (handler local), backdrop click, X button,
 * swipe-down mobile (drag handle au-dessus).
 *
 * Body scroll lock + focus trap via les hooks (étape 2).
 *
 * Le contenu interne (par mode) est rendu via children — chaque mode
 * (PostMode, StoryMode, etc.) est plugué par CreatorModalHost. */

type ContentCreatorModalProps = {
  open: boolean;
  mode: CreatorMode;
  onClose: () => void;
  onSwitchMode: (mode: CreatorMode) => void;
  children: React.ReactNode;
};

export function ContentCreatorModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  children,
}: ContentCreatorModalProps) {
  useBodyScrollLock(open);
  const containerRef = useFocusTrap<HTMLDivElement>(open);

  /* Escape ferme le modal — listener global pour ne pas dépendre du focus. */
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const meta = MODE_META[mode];
  const isStory = !!meta.fullscreenDark;

  /* Swipe-down handler mobile : si l'utilisateur drag le sheet de plus
     de 100px ou avec une vélocité positive significative, on ferme. */
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="creator-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          /* z-50 = au-dessus du bottom nav (z-40) et de tout le contenu app. */
          className={cn(
            "fixed inset-0 z-50 flex bg-night/60 backdrop-blur-md",
            isStory ? "items-stretch" : "items-end sm:items-center justify-center",
          )}
          onClick={onClose}
        >
          <motion.div
            key="creator-panel"
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Création — ${meta.label}`}
            onClick={(e) => e.stopPropagation()}
            initial={
              isStory ? { opacity: 0, scale: 1.02 } : { y: "100%" }
            }
            animate={isStory ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isStory ? { opacity: 0, scale: 1.02 } : { y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            drag={isStory ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative flex flex-col overflow-hidden",
              isStory
                ? /* Hauteur = min(100dvh, --viewport-visual-h) : sur iOS
                     PWA, --viewport-visual-h rétrécit en temps réel
                     avec le clavier → le modal story suit sans déborder. */
                  "w-full bg-black text-cream h-[min(100dvh,var(--viewport-visual-h,100dvh))]"
                : [
                    "w-full sm:w-[90%] sm:max-w-3xl",
                    /* Mobile : 95% du viewport visible (auto-shrink iOS).
                       Desktop sm+ : h-auto + max-h-[90vh] standard. */
                    "h-[min(95dvh,var(--viewport-visual-h,95dvh))] sm:h-auto sm:max-h-[90vh]",
                    "bg-bg sm:bg-bg",
                    "rounded-t-3xl sm:rounded-[20px]",
                    "shadow-[0_-30px_80px_-30px_rgba(10,31,68,0.55)] sm:shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)]",
                  ],
            )}
          >
            {/* Drag handle mobile (visible <sm). En story tout l'écran est
                fullscreen donc pas de handle. */}
            {!isStory ? (
              <div
                aria-hidden
                className="sm:hidden mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15 shrink-0"
              />
            ) : null}

            {/* Header : tabs de mode (sauf en story) + bouton fermer. */}
            <header
              className={cn(
                "flex items-center gap-3 shrink-0",
                isStory
                  ? "px-4 pt-4 pb-3"
                  : "px-4 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-line",
              )}
            >
              {!isStory ? (
                <nav
                  aria-label="Type de création"
                  className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto scrollbar-none"
                >
                  {ALL_MODES.map((m) => {
                    const ModeIcon = MODE_META[m].icon;
                    const active = m === mode;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onSwitchMode(m)}
                        aria-pressed={active}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold transition-colors",
                          active
                            ? "bg-night text-cream"
                            : "bg-white border border-line text-night-muted hover:border-night/30 hover:text-night",
                        )}
                      >
                        <ModeIcon className="w-3.5 h-3.5" aria-hidden />
                        {MODE_META[m].label}
                      </button>
                    );
                  })}
                </nav>
              ) : (
                <h2 className="font-display italic text-xl text-cream flex-1 min-w-0 truncate">
                  Story
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className={cn(
                  "shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                  isStory
                    ? "bg-white/10 text-cream hover:bg-white/20"
                    : "bg-white border border-line text-night-muted hover:border-night/30 hover:text-night",
                )}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            {/* Body scrollable — contenu spécifique au mode. */}
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* Wrapper qui consume le context et plug ContentCreatorModal. À utiliser
 * dans CreatorModalHost. */
export function CreatorModalShell({ children }: { children: React.ReactNode }) {
  const { state, close, switchMode } = useCreator();
  if (!state.mode) return null;
  return (
    <ContentCreatorModal
      open={state.open}
      mode={state.mode}
      onClose={close}
      onSwitchMode={(m) => switchMode(m)}
    >
      {children}
    </ContentCreatorModal>
  );
}

/* Placeholder neutre rendu en attendant que les modes soient pluggés
 * (étapes 4-7). */
export function CreatorModePlaceholder({ mode }: { mode: CreatorMode }) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <div
        aria-hidden
        className="w-16 h-16 rounded-2xl bg-gold/15 text-gold-deep flex items-center justify-center mb-4"
      >
        <Icon className="w-7 h-7" aria-hidden />
      </div>
      <h3 className="font-display italic text-2xl text-night mb-2">
        Mode {meta.label}
      </h3>
      <p className="text-sm text-night-muted max-w-sm">
        Le formulaire complet pour ce mode arrive aux étapes 4-7. La
        navigation entre modes (tabs en haut) est déjà fonctionnelle, ainsi
        que la fermeture (X / Escape / backdrop / swipe-down mobile).
      </p>
    </div>
  );
}
