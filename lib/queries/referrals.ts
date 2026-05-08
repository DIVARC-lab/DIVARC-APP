import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Job,
  JobReferralWithDetails,
  Profile,
} from "@/lib/database.types";

/** Cooptations reçues : amis qui m'ont recommandé pour un job. */
export async function listReferralsForMe(
  userId: string,
): Promise<JobReferralWithDetails[]> {
  return listReferralsForKey({ key: "referred_id", value: userId });
}

/** Cooptations envoyées par moi à des amis. */
export async function listReferralsByMe(
  userId: string,
): Promise<JobReferralWithDetails[]> {
  return listReferralsForKey({ key: "referrer_id", value: userId });
}

/** Cooptations sur un job (visible par le poster du job). */
export async function listReferralsOnJob(
  jobId: string,
): Promise<JobReferralWithDetails[]> {
  return listReferralsForKey({ key: "job_id", value: jobId });
}

async function listReferralsForKey(args: {
  key: "referred_id" | "referrer_id" | "job_id";
  value: string;
}): Promise<JobReferralWithDetails[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("job_referrals")
    .select("*")
    .eq(args.key, args.value)
    .order("created_at", { ascending: false });
  if (!rows || rows.length === 0) return [];

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.referrer_id, r.referred_id])),
  );
  const jobIds = Array.from(new Set(rows.map((r) => r.job_id)));

  const [{ data: profiles }, { data: jobs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", userIds),
    supabase
      .from("jobs")
      .select("id, title, company_name")
      .in("id", jobIds),
  ]);

  const profileById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();
  for (const p of profiles ?? []) profileById.set(p.id, p);
  const jobById = new Map<
    string,
    Pick<Job, "id" | "title" | "company_name">
  >();
  for (const j of jobs ?? []) jobById.set(j.id, j);

  return rows.map((r) => ({
    ...r,
    referrer: profileById.get(r.referrer_id) ?? null,
    referred: profileById.get(r.referred_id) ?? null,
    job: jobById.get(r.job_id) ?? null,
  }));
}

/** Vérifie si on a déjà coopté quelqu'un pour ce job. */
export async function listMyExistingReferrals(args: {
  userId: string;
  jobId: string;
}): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_referrals")
    .select("referred_id")
    .eq("job_id", args.jobId)
    .eq("referrer_id", args.userId);
  return (data ?? []).map((r) => r.referred_id);
}
