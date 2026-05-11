import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Company, Profile } from "@/lib/database.types";

export type CompanyEmployee = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url" | "headline"
> & {
  current_title: string | null;
};

export type CompanyPackage = {
  company: Company;
  employees: CompanyEmployee[];
  is_following: boolean;
};

export async function getCompanyBySlug(
  slug: string,
): Promise<CompanyPackage | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error || !company) return null;

  /* Fetch employés actuels (profile_experiences avec is_current=true). */
  const { data: experiences } = await supabase
    .from("profile_experiences")
    .select("user_id, title")
    .eq("company_id", company.id)
    .eq("is_current", true)
    .limit(50);

  const employeeIds = Array.from(
    new Set((experiences ?? []).map((e) => e.user_id as string)),
  );
  let employees: CompanyEmployee[] = [];
  if (employeeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, headline")
      .in("id", employeeIds);
    const expByUserId = new Map<string, string>();
    for (const e of experiences ?? []) {
      const uid = e.user_id as string;
      if (!expByUserId.has(uid)) {
        expByUserId.set(uid, e.title as string);
      }
    }
    employees = ((profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      headline: string | null;
    }>).map((p) => ({
      ...p,
      current_title: expByUserId.get(p.id) ?? null,
    }));
  }

  /* Vérifie si le viewer suit déjà la company. */
  let is_following = false;
  if (user) {
    const { data: f } = await supabase
      .from("company_followers")
      .select("user_id")
      .eq("company_id", company.id)
      .eq("user_id", user.id)
      .maybeSingle();
    is_following = f !== null;
  }

  return {
    company: company as Company,
    employees,
    is_following,
  };
}
