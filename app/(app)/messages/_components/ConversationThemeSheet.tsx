"use client";

import { Check, Palette, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CONVERSATION_THEMES,
  type ThemePreset,
  type WallpaperId,
  WALLPAPERS,
  getTheme,
  themeContainerStyle,
} from "@/lib/themes/conversationThemes";
import { setConversationTheme } from "../conv-prefs-actions";

type ConversationThemeSheetProps = {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  initialThemePreset: string | null;
  initialWallpaperId: string | null;
};

/* Bottom-sheet permettant à l'utilisateur de personnaliser SON
 * affichage d'une conversation (couleur d'accent + wallpaper de fond).
 * Le settings est stocké côté conversation_members (per-user × per-conv). */
export function ConversationThemeSheet({
  open,
  onClose,
  conversationId,
  initialThemePreset,
  initialWallpaperId,
}: ConversationThemeSheetProps) {
  const [pending, startTransition] = useTransition();
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(
    (initialThemePreset as ThemePreset) || "default",
  );
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperId>(
    (initialWallpaperId as WallpaperId) || "none",
  );

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* Reset à l'ouverture pour refléter l'état DB courant. */
  useEffect(() => {
    if (open) {
      setSelectedTheme((initialThemePreset as ThemePreset) || "default");
      setSelectedWallpaper((initialWallpaperId as WallpaperId) || "none");
    }
  }, [open, initialThemePreset, initialWallpaperId]);

  if (!open) return null;

  function handleSave() {
    startTransition(async () => {
      const res = await setConversationTheme(
        conversationId,
        selectedTheme,
        selectedWallpaper,
      );
      if (res.ok) {
        toast.success("Thème appliqué.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  const previewStyle = themeContainerStyle(selectedTheme, selectedWallpaper);
  const themeData = getTheme(selectedTheme);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personnaliser le thème"
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg border-t border-line rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] pb-[max(env(safe-area-inset-bottom,0px),16px)] max-h-[85dvh] overflow-y-auto"
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15"
        />

        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gold-deep" aria-hidden />
            <h2 className="text-sm font-bold text-night">Personnaliser</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Preview live des bulles */}
        <div className="px-4 pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted mb-2">
            Aperçu
          </p>
          <div
            style={previewStyle}
            className="rounded-2xl border border-line p-4 space-y-2"
          >
            {/* Bulle reçue */}
            <div className="flex">
              <div
                className="max-w-[70%] px-3 py-2 rounded-2xl text-[13px] shadow-sm"
                style={{
                  backgroundColor: themeData.bubbleOther,
                  color: themeData.bubbleOtherText,
                }}
              >
                Hello 👋
              </div>
            </div>
            {/* Bulle envoyée */}
            <div className="flex justify-end">
              <div
                className="max-w-[70%] px-3 py-2 rounded-2xl text-[13px] shadow-sm"
                style={{
                  backgroundColor: themeData.accent,
                  color: themeData.accentText,
                }}
              >
                Salut, ça va ?
              </div>
            </div>
          </div>
        </div>

        {/* Picker couleur */}
        <section className="px-4 pt-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted mb-2">
            Couleur
          </p>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(CONVERSATION_THEMES).map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl border transition-colors ${
                    isSelected
                      ? "border-night bg-night/5"
                      : "border-line hover:border-night/30"
                  }`}
                >
                  <span
                    aria-hidden
                    className="w-9 h-9 rounded-xl shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.previewColor} 100%)`,
                    }}
                  />
                  <span className="text-[10.5px] font-semibold text-night text-center leading-tight">
                    {theme.name}
                  </span>
                  {isSelected ? (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-night text-cream flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Picker wallpaper */}
        <section className="px-4 pt-5 pb-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted mb-2">
            Fond
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(WALLPAPERS).map((wp) => {
              const isSelected = selectedWallpaper === wp.id;
              return (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => setSelectedWallpaper(wp.id)}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-center transition-colors ${
                    isSelected
                      ? "border-night bg-night/5"
                      : "border-line hover:border-night/30"
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {wp.emoji}
                  </span>
                  <span className="text-[11px] font-semibold text-night">
                    {wp.name}
                  </span>
                  {isSelected ? (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-night text-cream flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="px-4 pt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 h-11 rounded-full bg-night/5 text-sm font-bold text-night-muted hover:bg-night/10 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="flex-1 h-11 rounded-full bg-night text-cream text-sm font-bold hover:bg-night-soft transition-colors disabled:opacity-50"
          >
            {pending ? "…" : "Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}
