import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Company, Job } from "@/lib/database.types";

export async function getCompanyBySlug(
  slug: string,
): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function listCompanies(options?: {
  industry?: string;
  search?: string;
  limit?: number;
}): Promise<Company[]> {
  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select("*")
    .order("followers_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);
  if (options?.industry) query = query.eq("industry", options.industry);
  if (options?.search) {
    const escaped = options.search.replace(/[%_]/g, "\\$&");
    query = query.ilike("name", `%${escaped}%`);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function listMyCompanies(userId: string): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function isFollowingCompany(
  companyId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_followers")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function listJobsByCompany(
  companyId: string,
  limit: number = 20,
): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}
