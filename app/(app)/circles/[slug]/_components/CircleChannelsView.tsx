"use client";

/* CircleChannelsView — page admin gestion des channels du cercle.
 *
 * Sprint B.3 — V1 : CRUD basique (create, edit, archive, reorder up/down)
 * + types text/announcement/forum. V2 = drag & drop reorder. */

import {
  ArrowDown,
  ArrowUp,
  Archive,
  Hash,
  Megaphone,
  MessagesSquare,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";
import type { CircleChannelSummary } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import {
  archiveCircleChannel,
  createCircleChannel,
  reorderCircleChannel,
  updateCircleChannel,
} from "../channels-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  initialChannels: CircleChannelSummary[];
};

type ChannelType = CircleChannelSummary["channel_type"];

const TYPE_META: Record<
  ChannelType,
  { label: string; description: string; icon: typeof Hash; color: string }
> = {
  text: {
    label: "Texte",
    description: "Feed standard de posts. Tout le monde peut publier.",
    icon: Hash,
    color: "text-night-dim",
  },
  announcement: {
    label: "Annonces",
    description:
      "Seuls les admins peuvent publier. Push notification à tous les membres.",
    icon: Megaphone,
    color: "text-gold-deep",
  },
  forum: {
    label: "Forum",
    description: "Threads style Reddit avec sort Hot/New/Top (V2).",
    icon: MessagesSquare,
    color: "text-emerald-600",
  },
};

export function CircleChannelsView({
  circleId,
  circleSlug,
  initialChannels,
}: Props) {
  const [channels, setChannels] = useState(initialChannels);
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingChannel, setEditingChannel] =
    useState<CircleChannelSummary | null>(null);

  function handleCreate(args: {
    name: string;
    slug: string;
    description: string;
    channel_type: ChannelType;
  }) {
    startTransition(async () => {
      const res = await createCircleChannel({
        circleId,
        circleSlug,
        name: args.name,
        slug: args.slug,
        description: args.description,
        channel_type: args.channel_type,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Channel créé ✓");
      setShowCreate(false);
      window.location.reload();
    });
  }

  function handleUpdate(args: {
    channelId: string;
    name: string;
    description: string;
    channel_type: ChannelType;
  }) {
    startTransition(async () => {
      const res = await updateCircleChannel({
        circleSlug,
        channelId: args.channelId,
        name: args.name,
        description: args.description,
        channel_type: args.channel_type,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Channel mis à jour ✓");
      setEditingChannel(null);
      window.location.reload();
    });
  }

  function handleArchive(channel: CircleChannelSummary) {
    if (channel.slug === "general") {
      toast.error("Le channel « Général » ne peut pas être archivé.");
      return;
    }
    if (!confirm(`Archiver #${channel.name} ?`)) return;
    setChannels((prev) => prev.filter((c) => c.id !== channel.id));
    startTransition(async () => {
      const res = await archiveCircleChannel({
        circleSlug,
        channelId: channel.id,
      });
      if (!res.ok) {
        toast.error(res.error);
        setChannels((prev) => [...prev, channel].sort(
          (a, b) => a.position - b.position,
        ));
        return;
      }
      toast.success("Channel archivé ✓");
    });
  }

  function handleReorder(
    channel: CircleChannelSummary,
    direction: "up" | "down",
  ) {
    const idx = channels.findIndex((c) => c.id === channel.id);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= channels.length) return;
    /* Optimistic swap. */
    const next = [...channels];
    [next[idx], next[neighborIdx]] = [next[neighborIdx], next[idx]];
    setChannels(next);
    startTransition(async () => {
      const res = await reorderCircleChannel({
        circleSlug,
        channelId: channel.id,
        direction,
      });
      if (!res.ok) {
        toast.error(res.error);
        setChannels(channels);
      }
    });
  }

  return (
    <section className="px-5 sm:px-8 max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>Channels du cercle</KickerLabel>
        </div>
        <Link
          href={`/circles/${circleSlug}`}
          className="text-[12px] text-night-dim hover:text-night transition-colors"
        >
          ← Retour au cercle
        </Link>
      </div>

      <p className="text-[13px] text-night-dim mb-5 leading-relaxed">
        Organise les discussions de ton cercle en plusieurs channels
        thématiques (Discord-style). Crée des channels d&apos;annonces pour
        réserver la publication aux admins, ou des channels forum pour des
        threads style Reddit (V2).
      </p>

      <Button
        type="button"
        size="sm"
        onClick={() => setShowCreate(true)}
        disabled={isPending}
        className="mb-4"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />
        Nouveau channel
      </Button>

      <ul className="space-y-2">
        {channels.map((channel, idx) => {
          const meta = TYPE_META[channel.channel_type];
          const Icon = meta.icon;
          const canMoveUp = idx > 0;
          const canMoveDown = idx < channels.length - 1;
          return (
            <li
              key={channel.id}
              className="flex items-start gap-3 rounded-2xl bg-white border border-line p-3.5 shadow-soft"
            >
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.color)} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-night">
                    #{channel.slug}
                  </span>
                  <span className="text-[12px] font-bold text-night-dim">
                    {channel.name}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      channel.channel_type === "announcement"
                        ? "bg-gold/15 text-gold-deep"
                        : channel.channel_type === "forum"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-bg-soft text-night-dim",
                    )}
                  >
                    {meta.label}
                  </span>
                  {channel.posts_count > 0 ? (
                    <span className="text-[11px] text-night-dim">
                      {channel.posts_count} post
                      {channel.posts_count > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
                {channel.description ? (
                  <p className="mt-1 text-[12px] text-night-dim leading-relaxed">
                    {channel.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReorder(channel, "up")}
                  disabled={!canMoveUp || isPending}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-bg-soft hover:text-night disabled:opacity-30 transition-colors"
                  aria-label="Monter"
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(channel, "down")}
                  disabled={!canMoveDown || isPending}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-bg-soft hover:text-night disabled:opacity-30 transition-colors"
                  aria-label="Descendre"
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChannel(channel)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-bg-soft hover:text-night disabled:opacity-30 transition-colors"
                  aria-label="Éditer"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(channel)}
                  disabled={isPending || channel.slug === "general"}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 transition-colors"
                  aria-label="Archiver"
                >
                  <Archive className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {showCreate ? (
        <ChannelFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          isPending={isPending}
        />
      ) : null}

      {editingChannel ? (
        <ChannelFormModal
          mode="edit"
          initial={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSubmit={(args) =>
            handleUpdate({
              channelId: editingChannel.id,
              name: args.name,
              description: args.description,
              channel_type: args.channel_type,
            })
          }
          isPending={isPending}
        />
      ) : null}
    </section>
  );
}

/* ============================================================
 * Modal form (create + edit)
 * ============================================================ */

type FormPayload = {
  name: string;
  slug: string;
  description: string;
  channel_type: ChannelType;
};

type ModalProps = {
  mode: "create" | "edit";
  initial?: CircleChannelSummary;
  onClose: () => void;
  onSubmit: (args: FormPayload) => void;
  isPending: boolean;
};

function ChannelFormModal({
  mode,
  initial,
  onClose,
  onSubmit,
  isPending,
}: ModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [channelType, setChannelType] = useState<ChannelType>(
    initial?.channel_type ?? "text",
  );

  /* Auto-slugify le name en mode création (jusqu'à ce que user édite slug). */
  const [slugDirty, setSlugDirty] = useState(false);
  function autoSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (mode === "create" && !slugDirty) {
      setSlug(autoSlug(value));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      channel_type: channelType,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-display font-bold text-night">
            {mode === "create" ? "Nouveau channel" : "Éditer channel"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-night-dim hover:bg-bg-soft"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="ch-name"
              className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1"
            >
              Nom
            </label>
            <input
              id="ch-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={50}
              minLength={2}
              required
              placeholder="ex: Présentations"
              className="w-full h-10 px-3 rounded-xl border border-line text-[14px] focus:outline-none focus:border-night/30"
            />
          </div>

          <div>
            <label
              htmlFor="ch-slug"
              className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1"
            >
              Slug (URL)
            </label>
            <input
              id="ch-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugDirty(true);
                setSlug(e.target.value.toLowerCase());
              }}
              pattern="^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$"
              required
              disabled={mode === "edit"}
              placeholder="presentations"
              className="w-full h-10 px-3 rounded-xl border border-line text-[14px] font-mono focus:outline-none focus:border-night/30 disabled:bg-bg-soft disabled:text-night-dim"
            />
            <p className="mt-1 text-[10px] text-night-dim">
              2-32 caractères, a-z 0-9 et tirets. Non modifiable après création.
            </p>
          </div>

          <div>
            <label
              htmlFor="ch-desc"
              className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-1"
            >
              Description (optionnel)
            </label>
            <textarea
              id="ch-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="ex: Présente-toi à la communauté."
              className="w-full px-3 py-2 rounded-xl border border-line text-[14px] resize-none focus:outline-none focus:border-night/30"
            />
          </div>

          <div>
            <p className="block text-[11px] font-bold uppercase tracking-wider text-night-dim mb-2">
              Type de channel
            </p>
            <div className="grid grid-cols-1 gap-2">
              {(["text", "announcement", "forum"] as ChannelType[]).map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                const active = channelType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChannelType(t)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-3 text-left rounded-xl border p-3 transition-colors",
                      active
                        ? "border-night bg-night/5"
                        : "border-line bg-white hover:border-night/30",
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4 mt-0.5 shrink-0", meta.color)}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-night">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-night-dim leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[13px] font-bold text-night-dim hover:text-night"
          >
            Annuler
          </button>
          <Button type="submit" size="sm" loading={isPending}>
            {mode === "create" ? "Créer" : "Mettre à jour"}
          </Button>
        </div>
      </form>
    </div>
  );
}
