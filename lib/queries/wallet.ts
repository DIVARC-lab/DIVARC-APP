import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Currency,
  PayoutRequest,
  Profile,
  TransactionWithCounterparty,
  Wallet,
} from "@/lib/database.types";

export async function listWallets(userId: string): Promise<Wallet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("currency", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ ...row, balance: Number(row.balance) }));
}

export async function getWalletForCurrency(
  userId: string,
  currency: Currency,
): Promise<Wallet | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, balance: Number(data.balance) };
}

export async function listTransactions(
  userId: string,
  limit: number = 50,
): Promise<TransactionWithCounterparty[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows) return [];

  const counterpartyIds = Array.from(
    new Set(
      rows.flatMap((row) => {
        const isOutgoing = row.sender_id === userId;
        const otherId = isOutgoing ? row.recipient_id : row.sender_id;
        return otherId ? [otherId] : [];
      }),
    ),
  );

  const profileById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();

  if (counterpartyIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", counterpartyIds);
    for (const profile of profiles ?? []) profileById.set(profile.id, profile);
  }

  return rows.map((row) => {
    const isOutgoing = row.sender_id === userId && row.recipient_id !== userId;
    const isIncoming = row.recipient_id === userId && row.sender_id !== null;
    const isCredit =
      row.type === "welcome_credit" ||
      (row.type === "topup" && row.sender_id === null);

    const counterpartyId = isOutgoing
      ? row.recipient_id
      : row.sender_id;

    const counterparty = counterpartyId
      ? profileById.get(counterpartyId) ?? null
      : null;

    return {
      ...row,
      amount: Number(row.amount),
      counterparty,
      direction: isCredit
        ? "credit"
        : isOutgoing
          ? "outgoing"
          : isIncoming
            ? "incoming"
            : "credit",
    } satisfies TransactionWithCounterparty;
  });
}

/* Liste les demandes de payout du user (pour la page wallet/payout history). */
export async function listMyPayoutRequests(
  userId: string,
  limit = 20,
): Promise<PayoutRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PayoutRequest[];
}

/* True si une demande est en pending/processing (gate UI : empêche d'en
 * créer une nouvelle tant que la précédente n'est pas traitée). */
export async function hasOpenPayoutRequest(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("payout_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["pending", "processing"]);
  return (count ?? 0) > 0;
}
