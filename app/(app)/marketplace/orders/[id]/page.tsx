import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONDITION_META } from "@/lib/utils/categories";
import { formatRelative } from "@/lib/utils/relativeTime";
import { SubmitReviewDialog } from "./SubmitReviewDialog";
import { OpenDisputeDialog } from "./OpenDisputeDialog";
import { Container } from "@/components/primitives/Container";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Détail de commande",
};

const STATUS_META: Record<
  string,
  { label: string; tone: "neutral" | "positive" | "warn" | "danger" }
> = {
  pending_payment: { label: "En attente de paiement", tone: "warn" },
  payment_processing: { label: "Paiement en cours", tone: "warn" },
  paid: { label: "Payée", tone: "neutral" },
  awaiting_shipment: { label: "En attente d'envoi", tone: "warn" },
  shipped: { label: "Expédiée", tone: "neutral" },
  in_transit: { label: "En transit", tone: "neutral" },
  delivered: { label: "Livrée", tone: "positive" },
  awaiting_confirmation: { label: "Confirmation acheteur", tone: "warn" },
  completed: { label: "Finalisée", tone: "positive" },
  cancelled: { label: "Annulée", tone: "neutral" },
  disputed: { label: "En litige", tone: "danger" },
  refunded: { label: "Remboursée", tone: "neutral" },
  partially_refunded: { label: "Partiellement remboursée", tone: "neutral" },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  if (order.buyer_id !== user.id && order.seller_id !== user.id) notFound();

  const isBuyer = order.buyer_id === user.id;
  const counterpartyId = isBuyer ? order.seller_id : order.buyer_id;
  const role: "buyer" | "seller" = isBuyer ? "buyer" : "seller";

  /* Charge counterparty + listing snapshot + review existante + dispute. */
  const [{ data: counterparty }, { data: myReview }, { data: dispute }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", counterpartyId)
        .maybeSingle(),
      supabase
        .from("marketplace_reviews")
        .select("id, rating, body")
        .eq("order_id", order.id)
        .eq("reviewer_id", user.id)
        .maybeSingle(),
      supabase
        .from("marketplace_disputes")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);

  const snapshot = order.listing_snapshot as {
    title?: string;
    description?: string | null;
    price_amount?: number;
    price_currency?: string;
    category?: string;
    condition?: string;
  };

  const statusMeta = STATUS_META[order.status] ?? {
    label: order.status,
    tone: "neutral" as const,
  };

  const canReview =
    (order.status === "delivered" || order.status === "completed") &&
    !myReview &&
    !dispute;
  const canOpenDispute =
    !dispute &&
    [
      "paid",
      "awaiting_shipment",
      "shipped",
      "in_transit",
      "delivered",
      "awaiting_confirmation",
    ].includes(order.status);

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)] pb-20">
      <Container maxWidth="text" paddingX="lg" paddingY="2xl">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Retour à la marketplace
        </Link>

        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Commande {order.order_number}
        </span>
        <h1 className="mt-1 font-display text-[26px] sm:text-[34px] text-night leading-tight">
          {snapshot.title ?? "Article"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-night-dim">
          <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
          <span>· Créée {formatRelative(order.created_at)}</span>
          {order.paid_at ? (
            <span>· Payée {formatRelative(order.paid_at)}</span>
          ) : null}
        </div>

        {/* Bloc parties */}
        <section className="mt-6 rounded-2xl bg-white border border-line p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
            · {isBuyer ? "Vendeur" : "Acheteur"}
          </p>
          {counterparty ? (
            <Link
              href={
                counterparty.username
                  ? `/u/${counterparty.username}`
                  : "/marketplace"
              }
              className="flex items-center gap-3 hover:underline"
            >
              <div className="w-10 h-10 rounded-full bg-bg-soft border border-line overflow-hidden flex items-center justify-center text-night font-extrabold text-sm">
                {counterparty.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={counterparty.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (counterparty.full_name ?? counterparty.username ?? "?")
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </div>
              <div>
                <p className="text-[13px] font-bold text-night">
                  {counterparty.full_name ?? counterparty.username ?? "—"}
                </p>
                {counterparty.username ? (
                  <p className="text-[11px] text-night-dim">
                    @{counterparty.username}
                  </p>
                ) : null}
              </div>
            </Link>
          ) : (
            <p className="text-[12px] text-night-dim">Utilisateur introuvable</p>
          )}
        </section>

        {/* Bloc article */}
        <section className="mt-3 rounded-2xl bg-white border border-line p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
            · Article
          </p>
          <p className="text-[14px] font-bold text-night">{snapshot.title}</p>
          {snapshot.condition ? (
            <p className="mt-0.5 text-[12px] text-night-dim">
              État : {CONDITION_META[snapshot.condition as keyof typeof CONDITION_META] ?? snapshot.condition}
            </p>
          ) : null}
        </section>

        {/* Bloc montants */}
        <section className="mt-3 rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
          <MoneyRow
            label="Article"
            amount={order.item_price}
            currency={order.currency}
          />
          {Number(order.shipping_price) > 0 ? (
            <MoneyRow
              label="Livraison"
              amount={order.shipping_price}
              currency={order.currency}
            />
          ) : null}
          {Number(order.divarc_commission) > 0 && isBuyer === false ? (
            <MoneyRow
              label="Commission DIVARC"
              amount={-order.divarc_commission}
              currency={order.currency}
            />
          ) : null}
          <MoneyRow
            label={isBuyer ? "Total payé" : "Tu reçois"}
            amount={isBuyer ? order.total_amount : order.seller_amount}
            currency={order.currency}
            highlight
          />
        </section>

        {/* Bloc dispute existant */}
        {dispute ? (
          <section className="mt-3 rounded-2xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="w-4 h-4 text-red-600 mt-0.5 shrink-0"
                aria-hidden
              />
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-wider text-red-700">
                  · Litige ouvert
                </p>
                <p className="mt-1 text-[13px] font-semibold text-night">
                  Statut : {dispute.status}
                </p>
                {dispute.body ? (
                  <p className="mt-1.5 text-[12px] text-night-soft whitespace-pre-wrap">
                    {dispute.body}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-night-dim">
                  Ouvert {formatRelative(dispute.created_at)} · L'équipe DIVARC
                  examine ton litige sous 72h.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Bloc review existante */}
        {myReview ? (
          <section className="mt-3 rounded-2xl bg-white border border-line p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep mb-2">
              · Ton avis
            </p>
            <div className="flex items-center gap-2 text-amber-500 text-base font-extrabold">
              {"★".repeat(myReview.rating)}
              <span className="text-night-dim font-normal">
                ({myReview.rating}/5)
              </span>
            </div>
            {myReview.body ? (
              <p className="mt-2 text-[13px] text-night-soft whitespace-pre-wrap">
                {myReview.body}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* CTA actions */}
        <div className="mt-6 flex flex-col gap-2">
          {canReview ? (
            <SubmitReviewDialog
              orderId={order.id}
              counterpartyName={
                counterparty?.full_name ??
                counterparty?.username ??
                (isBuyer ? "le vendeur" : "l'acheteur")
              }
              role={role}
            />
          ) : null}
          {canOpenDispute ? (
            <OpenDisputeDialog orderId={order.id} role={role} />
          ) : null}
        </div>
      </Container>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "positive" | "warn" | "danger";
}) {
  const toneClass = {
    neutral: "bg-night/10 text-night",
    positive: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  }[tone];
  const Icon = {
    neutral: Package,
    positive: CheckCircle2,
    warn: Clock,
    danger: AlertTriangle,
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold ${toneClass}`}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </span>
  );
}

function MoneyRow({
  label,
  amount,
  currency,
  highlight,
}: {
  label: string;
  amount: number;
  currency: string;
  highlight?: boolean;
}) {
  const formatted = formatMoney(Number(amount), currency);
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span
        className={
          highlight
            ? "text-[13px] font-extrabold text-night"
            : "text-[12px] text-night-dim"
        }
      >
        {label}
      </span>
      <span
        className={
          highlight
            ? "font-display italic text-[18px] text-night"
            : "text-[13px] font-semibold text-night"
        }
      >
        {formatted}
      </span>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return "—";
  const symbol = currency === "EUR" ? "€" : currency;
  const formatted = amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
}
