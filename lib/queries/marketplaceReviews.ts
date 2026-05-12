import "server-only";
import { createClient } from "@/lib/supabase/server";

/* Chantier 6 — Agrégats reviews pour affichage profil/listing. */

export type SellerRatingSummary = {
  averageRating: number; // 0-5
  totalCount: number;
};

export async function getSellerRatingSummary(
  sellerId: string,
): Promise<SellerRatingSummary> {
  const supabase = await createClient();

  /* On lit toutes les reviews dont reviewee_id = seller. RLS publique
   * (cf. migration 0088) → on peut compter / moyenner. */
  const { data, error } = await supabase
    .from("marketplace_reviews")
    .select("rating")
    .eq("reviewee_id", sellerId);

  if (error || !data || data.length === 0) {
    return { averageRating: 0, totalCount: 0 };
  }

  const total = data.reduce(
    (acc, row) => acc + ((row as { rating: number }).rating ?? 0),
    0,
  );
  return {
    averageRating: total / data.length,
    totalCount: data.length,
  };
}

/* DAC7 — récupère l'agrégat annuel du seller. */
export async function getSellerDac7Yearly(
  sellerId: string,
): Promise<
  Array<{
    year: number;
    totalOrders: number;
    totalRevenueEur: number;
    hasDac7Threshold: boolean;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dac7_seller_yearly_revenue")
    .select("*")
    .eq("seller_id", sellerId)
    .order("year", { ascending: false });

  if (!data) return [];

  return data.map(
    (r: {
      year: number;
      total_orders: number;
      total_revenue_eur: number | string;
      has_dac7_threshold: boolean;
    }) => ({
      year: r.year,
      totalOrders: r.total_orders,
      totalRevenueEur: Number(r.total_revenue_eur),
      hasDac7Threshold: r.has_dac7_threshold,
    }),
  );
}
