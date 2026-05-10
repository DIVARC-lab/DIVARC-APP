import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AdAccount,
  AdsBusinessAccount,
  AdsCampaign,
} from "@/lib/database.types";

/* Queries server-only pour /ads-manager. Toutes les fonctions
 * supposent que le caller est authentifié, et reposent sur les RLS
 * (multi-tenant via ad_account_users) pour filtrer. */

export async function listMyAdAccounts(): Promise<
  Array<
    AdAccount & {
      business_legal_name: string | null;
      role: string | null;
    }
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  /* Lecture des ad_account_users où user_id = me + jointure ad_account
     + business pour avoir le nom de l'entreprise. */
  const { data: links } = await supabase
    .from("ad_account_users")
    .select("ad_account_id, role")
    .eq("user_id", user.id);

  if (!links || links.length === 0) return [];

  const accountIds = links.map((l) => l.ad_account_id);
  const { data: accounts } = await supabase
    .from("ad_accounts")
    .select("*")
    .in("id", accountIds);

  if (!accounts) return [];

  const businessIds = Array.from(
    new Set(accounts.map((a) => a.business_account_id)),
  );
  const { data: businesses } = await supabase
    .from("ads_business_accounts")
    .select("id, legal_name")
    .in("id", businessIds);
  const bizMap = new Map((businesses ?? []).map((b) => [b.id, b.legal_name]));
  const roleMap = new Map(links.map((l) => [l.ad_account_id, l.role]));

  return accounts.map((a) => ({
    ...a,
    business_legal_name: bizMap.get(a.business_account_id) ?? null,
    role: roleMap.get(a.id) ?? null,
  }));
}

export async function getAdAccount(
  adAccountId: string,
): Promise<AdAccount | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", adAccountId)
    .maybeSingle();
  return data;
}

export async function listCampaigns(
  adAccountId: string,
): Promise<AdsCampaign[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ads_campaigns")
    .select("*")
    .eq("ad_account_id", adAccountId)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getCampaign(
  campaignId: string,
): Promise<AdsCampaign | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ads_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  return data;
}

export async function getMyBusinessAccounts(): Promise<AdsBusinessAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ads_business_accounts")
    .select("*")
    .eq("primary_contact_user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/* Stats agrégées d'un ad_account pour le dashboard. */
export async function getAdAccountStats(
  adAccountId: string,
): Promise<{
  active_campaigns: number;
  total_spend_30d: number;
  total_impressions_30d: number;
  total_clicks_30d: number;
  ctr_30d: number;
}> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ count: activeCampaigns }, { data: spend }, { count: impressions }, { count: clicks }] =
    await Promise.all([
      supabase
        .from("ads_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("ad_account_id", adAccountId)
        .eq("status", "active"),
      supabase
        .from("ads_charges")
        .select("amount")
        .eq("ad_account_id", adAccountId)
        .eq("type", "spend")
        .gte("created_at", since),
      supabase
        .from("ad_impressions")
        .select("id", { count: "exact", head: true })
        .eq("ad_account_id", adAccountId)
        .gte("created_at", since),
      supabase
        .from("ad_clicks")
        .select("id", { count: "exact", head: true })
        .eq("ad_account_id", adAccountId)
        .gte("created_at", since)
        .eq("is_invalid", false),
    ]);

  const totalSpend =
    spend?.reduce((acc, s) => acc + Number(s.amount), 0) ?? 0;
  const ctr =
    impressions && impressions > 0 ? (clicks ?? 0) / impressions : 0;

  return {
    active_campaigns: activeCampaigns ?? 0,
    total_spend_30d: totalSpend,
    total_impressions_30d: impressions ?? 0,
    total_clicks_30d: clicks ?? 0,
    ctr_30d: ctr,
  };
}
