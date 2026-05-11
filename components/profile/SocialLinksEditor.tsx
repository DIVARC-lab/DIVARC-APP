"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  ProfileSocialLink,
  ProfileSocialLinkKind,
} from "@/lib/database.types";

/* SocialLinksEditor — gère la liste des liens sociaux externes (jsonb).
 *
 * Pas de drag-drop full V1 (boutons up/down). Drag complet en V4.
 * V1 : ajouter/supprimer/réordonner par flèches.
 *
 * Validation côté UI :
 *   - URL HTTPS obligatoire (input type="url")
 *   - Label optionnel (custom uniquement)
 *   - Max 15 liens */

const KINDS: Array<{ id: ProfileSocialLinkKind; label: string }> = [
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "github", label: "GitHub" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "behance", label: "Behance" },
  { id: "dribbble", label: "Dribbble" },
  { id: "mastodon", label: "Mastodon" },
  { id: "bluesky", label: "Bluesky" },
  { id: "custom", label: "Autre" },
];

const MAX_LINKS = 15;

type Props = {
  value: ProfileSocialLink[];
  onChange: (links: ProfileSocialLink[]) => void;
};

export function SocialLinksEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState<ProfileSocialLink>({
    kind: "instagram",
    url: "",
  });

  function addLink() {
    if (!draft.url || value.length >= MAX_LINKS) return;
    /* Validation URL minimale côté client */
    try {
      new URL(draft.url);
    } catch {
      return;
    }
    onChange([
      ...value,
      {
        kind: draft.kind,
        url: draft.url.trim(),
        label: draft.kind === "custom" ? draft.label : undefined,
      },
    ]);
    setDraft({ kind: "instagram", url: "", label: undefined });
  }

  function removeLink(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function moveLink(index: number, direction: 1 | -1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {/* Liste existante */}
      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((link, idx) => (
            <li
              key={`${link.kind}-${idx}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-soft border border-line"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-night-muted shrink-0 w-20 truncate">
                {KINDS.find((k) => k.id === link.kind)?.label ?? link.kind}
              </span>
              <span className="flex-1 min-w-0 text-[13px] text-night truncate">
                {link.label ? `${link.label} · ` : ""}
                {link.url}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveLink(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Monter"
                  className="w-7 h-7 rounded flex items-center justify-center text-night-muted hover:bg-white disabled:opacity-30"
                >
                  <GripVertical className="w-3 h-3 rotate-90" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => moveLink(idx, 1)}
                  disabled={idx === value.length - 1}
                  aria-label="Descendre"
                  className="w-7 h-7 rounded flex items-center justify-center text-night-muted hover:bg-white disabled:opacity-30"
                >
                  <GripVertical className="w-3 h-3 -rotate-90" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  aria-label="Supprimer"
                  className="w-7 h-7 rounded flex items-center justify-center text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Ajout nouveau */}
      {value.length < MAX_LINKS ? (
        <div className="rounded-xl border border-dashed border-line p-3 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={draft.kind}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  kind: e.target.value as ProfileSocialLinkKind,
                  label: e.target.value === "custom" ? "" : undefined,
                })
              }
              className="px-3 h-10 rounded-lg border border-line bg-white text-[13px] text-night focus:border-gold-deep focus:outline-none"
            >
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            {draft.kind === "custom" ? (
              <input
                type="text"
                placeholder="Libellé (max 40)"
                value={draft.label ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, label: e.target.value.slice(0, 40) })
                }
                className="px-3 h-10 rounded-lg border border-line bg-white text-[13px] text-night focus:border-gold-deep focus:outline-none"
              />
            ) : null}
            <input
              type="url"
              placeholder="https://…"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              className="flex-1 px-3 h-10 rounded-lg border border-line bg-white text-[13px] text-night focus:border-gold-deep focus:outline-none"
            />
            <button
              type="button"
              onClick={addLink}
              disabled={!draft.url}
              className={cn(
                "h-10 px-4 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 justify-center",
                draft.url
                  ? "bg-gold-deep text-white hover:bg-gold"
                  : "bg-night/10 text-night-muted cursor-not-allowed",
              )}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-night-dim">
          Maximum {MAX_LINKS} liens atteint.
        </p>
      )}
    </div>
  );
}
