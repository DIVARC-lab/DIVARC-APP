"use client";

/* CircleRequestsView — board Demandes & Offres avec création inline.
 *
 * Layout :
 *  - Header avec compteurs + filter kind (Tous / Demandes / Offres)
 *  - Bouton "Nouvelle demande" / "Nouvelle offre" ouvre un modal
 *  - Liste des requests avec badge kind + budget + tags + responses
 *  - Click sur une request → modal détail + bouton "Répondre"
 *
 * Optimistic UI : nouvelle request ajoutée immédiatement, rollback
 * en cas d'erreur. */

import {
  ArrowRight,
  CheckCircle2,
  Coins,
  HandshakeIcon,
  MapPin,
  Plus,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type { CircleRequestWithAuthor } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  createCircleRequest,
  markCircleRequestFulfilled,
  respondToCircleRequest,
} from "../requests-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  currentUserId: string;
  initialRequests: CircleRequestWithAuthor[];
  myKarma: number;
};

type Filter = "all" | "request" | "offer";

export function CircleRequestsView({
  circleId,
  circleSlug,
  currentUserId,
  initialRequests,
  myKarma,
}: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState<null | "request" | "offer">(null);
  const [respondingTo, setRespondingTo] = useState<CircleRequestWithAuthor | null>(null);

  const filtered = requests.filter((r) =>
    filter === "all" ? true : r.kind === filter,
  );

  function handleCreated(req: CircleRequestWithAuthor) {
    setRequests((prev) => [req, ...prev]);
    setCreating(null);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display italic text-2xl sm:text-3xl text-night flex items-center gap-2">
            <HandshakeIcon className="w-6 h-6 text-gold-deep" aria-hidden />
            Demandes &amp; Offres
          </h1>
          <p className="text-[12.5px] text-night-muted mt-1">
            Les membres se rendent service. Karma actuel :{" "}
            <strong className="text-gold-deep tabular-nums">{myKarma}</strong>{" "}
            pts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreating("request")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-night text-cream text-[12px] font-bold hover:bg-night-soft"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Demander
          </button>
          <button
            type="button"
            onClick={() => setCreating("offer")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-gold text-night text-[12px] font-bold hover:bg-gold-soft"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Offrir
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 p-1 w-fit rounded-full bg-night/5 border border-line">
        {(["all", "request", "offer"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold transition-colors",
              filter === k
                ? "bg-night text-cream"
                : "text-night-muted hover:text-night",
            )}
          >
            {k === "all" ? "Tous" : k === "request" ? "Demandes" : "Offres"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13px] text-night-muted py-8 text-center">
          {filter === "all"
            ? "Aucune annonce pour l'instant. Sois le premier à demander ou offrir !"
            : `Aucune ${filter === "request" ? "demande" : "offre"} pour l'instant.`}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              isOwn={r.author_id === currentUserId}
              onRespond={() => setRespondingTo(r)}
              onMarkFulfilled={async () => {
                const res = await markCircleRequestFulfilled({
                  requestId: r.id,
                  circleSlug,
                });
                if (!res.ok) {
                  toast.error(res.error);
                } else {
                  toast.success("Annonce marquée comme aboutie");
                  setRequests((prev) =>
                    prev.map((x) =>
                      x.id === r.id ? { ...x, status: "fulfilled" } : x,
                    ),
                  );
                }
              }}
            />
          ))}
        </div>
      )}

      {creating ? (
        <CreateRequestModal
          kind={creating}
          circleId={circleId}
          circleSlug={circleSlug}
          currentUserId={currentUserId}
          onCancel={() => setCreating(null)}
          onCreated={handleCreated}
        />
      ) : null}

      {respondingTo ? (
        <RespondModal
          request={respondingTo}
          circleSlug={circleSlug}
          onClose={() => setRespondingTo(null)}
        />
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  isOwn,
  onRespond,
  onMarkFulfilled,
}: {
  request: CircleRequestWithAuthor;
  isOwn: boolean;
  onRespond: () => void;
  onMarkFulfilled: () => void;
}) {
  const r = request;
  const isOffer = r.kind === "offer";
  const fulfilled = r.status === "fulfilled";

  return (
    <article
      className={cn(
        "bg-white border rounded-2xl p-4 flex flex-col gap-2 relative",
        fulfilled
          ? "border-line opacity-70"
          : isOffer
            ? "border-gold/30"
            : "border-line",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center px-2 h-5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.08em]",
            isOffer
              ? "bg-gold text-night"
              : "bg-night text-cream",
          )}
        >
          {isOffer ? "Offre" : "Demande"}
        </span>
        {fulfilled ? (
          <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-extrabold uppercase tracking-[0.08em]">
            <CheckCircle2 className="w-3 h-3" aria-hidden />
            Abouti
          </span>
        ) : null}
        {r.karma_boost > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-gold/10 text-gold-deep text-[10px] font-extrabold uppercase">
            <Coins className="w-3 h-3" aria-hidden />
            Boost
          </span>
        ) : null}
        <span className="ml-auto text-[10px] text-night-muted tabular-nums">
          {formatRelative(r.created_at)}
        </span>
      </div>

      <h3 className="text-[15px] font-bold text-night leading-snug">
        {r.title}
      </h3>

      {r.body ? (
        <p className="text-[13px] text-night/80 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {r.body}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-night-muted">
        {r.budget_amount !== null ? (
          <span className="inline-flex items-center gap-1 font-bold text-night">
            <Coins className="w-3 h-3" aria-hidden />
            {r.budget_currency === "KARMA"
              ? `${r.budget_amount} karma`
              : `${r.budget_amount} ${r.budget_currency ?? ""}`}
          </span>
        ) : (
          <span className="font-semibold text-emerald-600">Gratuit</span>
        )}
        {r.is_remote ? null : (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden />
            {r.location_city ?? "Sur place"}
          </span>
        )}
        {r.tags && r.tags.length > 0 ? (
          <div className="inline-flex items-center gap-1">
            <Tag className="w-3 h-3" aria-hidden />
            {r.tags.slice(0, 3).join(" · ")}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-line">
        {r.author ? (
          <>
            <Avatar
              src={r.author.avatar_url}
              fullName={r.author.full_name ?? "?"}
              size="sm"
            />
            <Link
              href={r.author.username ? `/u/${r.author.username}` : "#"}
              className="text-[12px] font-semibold text-night hover:underline truncate"
            >
              {r.author.full_name ?? r.author.username ?? "?"}
            </Link>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          {r.responses_count && r.responses_count > 0 ? (
            <span className="text-[10px] text-night-muted tabular-nums">
              {r.responses_count} réponse{r.responses_count > 1 ? "s" : ""}
            </span>
          ) : null}
          {isOwn && !fulfilled ? (
            <button
              type="button"
              onClick={onMarkFulfilled}
              className="inline-flex items-center h-7 px-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden />
              Aboutie
            </button>
          ) : !isOwn && !fulfilled ? (
            <button
              type="button"
              onClick={onRespond}
              className="inline-flex items-center h-7 px-2.5 rounded-full bg-night hover:bg-night-soft text-cream text-[11px] font-bold"
            >
              Répondre
              <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CreateRequestModal({
  kind,
  circleId,
  circleSlug,
  currentUserId,
  onCancel,
  onCreated,
}: {
  kind: "request" | "offer";
  circleId: string;
  circleSlug: string;
  currentUserId: string;
  onCancel: () => void;
  onCreated: (req: CircleRequestWithAuthor) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XOF" | "XAF" | "KARMA">("EUR");
  const [tagsRaw, setTagsRaw] = useState("");
  const [isRemote, setIsRemote] = useState(true);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (title.trim().length < 3) {
      toast.error("Le titre doit faire au moins 3 caractères");
      return;
    }
    startTransition(async () => {
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 8);
      const budgetAmount = budget.trim().length > 0 ? Number(budget) : null;
      const res = await createCircleRequest({
        circleId,
        circleSlug,
        kind,
        title: title.trim(),
        body: body.trim() || undefined,
        tags,
        budgetAmount,
        budgetCurrency: budgetAmount !== null ? currency : null,
        isRemote,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(kind === "request" ? "Demande créée" : "Offre créée");
      onCreated({
        id: res.id,
        circle_id: circleId,
        author_id: currentUserId,
        kind,
        title: title.trim(),
        body: body.trim() || null,
        tags,
        budget_amount: budgetAmount,
        budget_currency: budgetAmount !== null ? currency : null,
        is_remote: isRemote,
        location_city: null,
        status: "open",
        karma_boost: 0,
        fulfilled_by: null,
        fulfilled_at: null,
        expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        author: null,
        responses_count: 0,
      });
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={kind === "request" ? "Nouvelle demande" : "Nouvelle offre"}
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-xl text-night">
            Nouvelle {kind === "request" ? "demande" : "offre"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-3">
          <Field label="Titre" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "request"
                  ? "Ex: Je cherche un dev React pour 2h"
                  : "Ex: Je propose 1h de mentorat marketing"
              }
              maxLength={140}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
            />
          </Field>
          <Field label="Détails (optionnel)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Précise ce que tu cherches / offres exactement"
              rows={3}
              maxLength={4000}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y"
            />
          </Field>
          <Field label="Tags (séparés par virgule)">
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ex: react, design, urgent"
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget (optionnel)">
              <input
                type="number"
                step="any"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0 = gratuit"
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
              />
            </Field>
            <Field label="Devise">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="XOF">XOF</option>
                <option value="XAF">XAF</option>
                <option value="KARMA">Karma</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-night cursor-pointer">
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
              className="rounded"
            />
            Possible à distance
          </label>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 h-10 rounded-full bg-gold text-night font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? "Publication…" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function RespondModal({
  request,
  circleSlug,
  onClose,
}: {
  request: CircleRequestWithAuthor;
  circleSlug: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (message.trim().length < 1) return;
    startTransition(async () => {
      const res = await respondToCircleRequest({
        requestId: request.id,
        circleSlug,
        message: message.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Réponse envoyée");
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Répondre à l'annonce"
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-display italic text-xl text-night">Répondre</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <p className="text-[13px] text-night-muted mb-3 line-clamp-2">
          <strong className="text-night">{request.title}</strong>
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Présente ton expérience, demande des précisions, propose un prix…`}
          rows={4}
          maxLength={2000}
          autoFocus
          className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y"
        />
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || message.trim().length === 0}
            className="flex-1 h-10 rounded-full bg-gold text-night font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
