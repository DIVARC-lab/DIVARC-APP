import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AdAccount,
  AdsBusinessAccount,
  AdsCampaign,
} from "@/lib/database.types";

/* Queries server-only pour /ads-manager.
 *
 * Toutes les fonctions sont défensives : si les migrations 0048 +
 * 0049 ne sont pas encore appliquées en prod (tables ads_* manquantes),
 * elles retournent des valeurs par défaut au lieu de crasher la page.
 *
 * Détection : le code postgres 42P01 ("relation does not exist") est
 * loggé en warning mais la page reste rendable. Les caller affichent
 * alors un état "vide" + bannière documentée.
 */

const MIGRATION_MISSING_CODE = "42P01";

/** True si la table ads_* n'existe pas encore (migration pas appliquée). */
export type AdsAvailability = {
  available: boolean;
  reason?: "tables_missing" | "permission_denied";
};

export async function checkAdsAvailability(): Promise<AdsAvailability> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_accounts")
    .select("id", { count: "exact", head: true });
  if (!error) return { available: true };
  if (error.code === MIGRATION_MISSING_CODE) {
    return { available: false, reason: "tables_missing" };
  }
  return { available: false, reason: "permission_denied" };
}

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

  const { data: links, error: linksErr } = await supabase
    .from("ad_account_users")
    .select("ad_account_id, role")
    .eq("user_id", user.id);

  if (linksErr) {
    if (linksErr.code !== MIGRATION_MISSING_CODE) {
      console.error("[ads:listMyAdAccounts]", linksErr);
    }
    return [];
  }
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
  const { data, error } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", adAccountId)
    .maybeSingle();
  if (error && error.code !== MIGRATION_MISSING_CODE) {
    console.error("[ads:getAdAccount]", error);
  }
  return data ?? null;
}

export async function listCampaigns(
  adAccountId: string,
): Promise<AdsCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_campaigns")
    .select("*")
    .eq("ad_account_id", adAccountId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error && error.code !== MIGRATION_MISSING_CODE) {
    console.error("[ads:listCampaigns]", error);
  }
  return data ?? [];
}

export async function getCampaign(
  campaignId: string,
): Promise<AdsCampaign | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (error && error.code !== MIGRATION_MISSING_CODE) {
    console.error("[ads:getCampaign]", error);
  }
  return data ?? null;
}

export async function getMyBusinessAccounts(): Promise<AdsBusinessAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ads_business_accounts")
    .select("*")
    .eq("primary_contact_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error && error.code !== MIGRATION_MISSING_CODE) {
    console.error("[ads:getMyBusinessAccounts]", error);
  }
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
  const empty = {
    active_campaigns: 0,
    total_spend_30d: 0,
    total_impressions_30d: 0,
    total_clicks_30d: 0,
    ctr_30d: 0,
  };
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [
      { count: activeCampaigns, error: ec },
      { data: spend, error: es },
      { count: impressions, error: ei },
      { count: clicks, error: ec2 },
    ] = await Promise.all([
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

    /* Si une seule des queries échoue avec 42P01 (table missing),
       on retourne empty. */
    if (
      [ec, es, ei, ec2].some(
        (e) => e && e.code === MIGRATION_MISSING_CODE,
      )
    ) {
      return empty;
    }

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
  } catch (err) {
    console.error("[ads:getAdAccountStats]", err);
    return empty;
  }
}
