import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Job,
  JobApplication,
  JobApplicationWithApplicant,
  JobCategory,
  JobType,
  JobWithDetails,
  Profile,
  WorkMode,
} from "@/lib/database.types";

type PosterRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

type ListJobsOptions = {
  category?: JobCategory;
  jobType?: JobType;
  workMode?: WorkMode;
  query?: string;
  skills?: string[];
  limit?: number;
  posterId?: string;
  status?: Job["status"];
};

async function attachDetails(
  rows: Job[],
  currentUserId: string,
): Promise<JobWithDetails[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const jobIds = rows.map((row) => row.id);
  const posterIds = Array.from(new Set(rows.map((row) => row.poster_id)));

  const [
    { data: posters },
    { data: applicationsCount },
    { data: savedRows },
    { data: myApplications },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", posterIds),
    supabase
      .from("job_applications")
      .select("job_id")
      .in("job_id", jobIds),
    supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", currentUserId)
      .in("job_id", jobIds),
    supabase
      .from("job_applications")
      .select("id, job_id, status, created_at, message")
      .eq("applicant_id", currentUserId)
      .in("job_id", jobIds),
  ]);

  const posterById = new Map<string, PosterRow>();
  for (const poster of posters ?? []) posterById.set(poster.id, poster);

  const applicationsByJob = new Map<string, number>();
  for (const app of applicationsCount ?? []) {
    applicationsByJob.set(
      app.job_id,
      (applicationsByJob.get(app.job_id) ?? 0) + 1,
    );
  }

  const savedSet = new Set((savedRows ?? []).map((row) => row.job_id));
  const myApplicationByJob = new Map<
    string,
    Pick<JobApplication, "id" | "status" | "created_at" | "message">
  >();
  for (const app of myApplications ?? []) {
    myApplicationByJob.set(app.job_id, {
      id: app.id,
      status: app.status,
      created_at: app.created_at,
      message: app.message,
    });
  }

  return rows.map((row) => {
    const myApp = myApplicationByJob.get(row.id) ?? null;
    return {
      ...row,
      poster: posterById.get(row.poster_id) ?? null,
      applications_count: applicationsByJob.get(row.id) ?? 0,
      is_saved: savedSet.has(row.id),
      has_applied: myApp !== null && myApp.status !== "withdrawn",
      my_application: myApp,
    };
  });
}

export async function listJobs(
  currentUserId: string,
  options: ListJobsOptions = {},
): Promise<JobWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select("*")
    .eq("status", options.status ?? "active")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.category) query = query.eq("category", options.category);
  if (options.jobType) query = query.eq("job_type", options.jobType);
  if (options.workMode) query = query.eq("work_mode", options.workMode);
  if (options.posterId) query = query.eq("poster_id", options.posterId);

  if (options.query && options.query.trim().length > 0) {
    const sanitized = options.query.trim().replace(/[%,]/g, "").slice(0, 80);
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,company_name.ilike.%${sanitized}%`,
    );
  }

  // Filtre par compétences : on cherche les skills mentionnées dans le titre ou
  // la description (ILIKE OR). Heuristique simple côté Postgres, suffisamment
  // efficace tant que le volume reste modéré.
  if (options.skills && options.skills.length > 0) {
    const cleanSkills = options.skills
      .map((s) => s.trim().replace(/[%,]/g, "").slice(0, 40))
      .filter((s) => s.length > 0)
      .slice(0, 6);
    if (cleanSkills.length > 0) {
      const orParts = cleanSkills
        .flatMap((s) => [`title.ilike.%${s}%`, `description.ilike.%${s}%`])
        .join(",");
      query = query.or(orParts);
    }
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

export async function getJobById(
  id: string,
  currentUserId: string,
): Promise<JobWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const [enriched] = await attachDetails([data], currentUserId);
  return enriched ?? null;
}

export async function listMyJobs(
  userId: string,
): Promise<JobWithDetails[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("poster_id", userId)
    .order("created_at", { ascending: false });
  if (!data) return [];
  return attachDetails(data, userId);
}

export async function listSavedJobs(
  userId: string,
): Promise<JobWithDetails[]> {
  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("saved_jobs")
    .select("job_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!saved || saved.length === 0) return [];

  const jobIds = saved.map((s) => s.job_id);
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .in("id", jobIds);
  if (!jobs) return [];

  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const orderedJobs = jobIds
    .map((id) => jobById.get(id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j));

  return attachDetails(orderedJobs, userId);
}

export async function listMyApplications(
  userId: string,
): Promise<
  Array<JobApplication & { job: Pick<Job, "id" | "title" | "company_name" | "status"> }>
> {
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("job_applications")
    .select("*")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });

  if (!applications || applications.length === 0) return [];

  const jobIds = Array.from(new Set(applications.map((a) => a.job_id)));
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, company_name, status")
    .in("id", jobIds);

  const jobById = new Map<
    string,
    Pick<Job, "id" | "title" | "company_name" | "status">
  >();
  for (const job of jobs ?? []) jobById.set(job.id, job);

  return applications.flatMap((app) => {
    const job = jobById.get(app.job_id);
    if (!job) return [];
    return [{ ...app, job }];
  });
}

export async function listApplicationsForJob(
  jobId: string,
): Promise<JobApplicationWithApplicant[]> {
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (!applications || applications.length === 0) return [];

  const applicantIds = Array.from(
    new Set(applications.map((a) => a.applicant_id)),
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, location")
    .in("id", applicantIds);

  const profileById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "bio" | "location">
  >();
  for (const profile of profiles ?? []) profileById.set(profile.id, profile);

  return applications.map((app) => ({
    ...app,
    applicant: profileById.get(app.applicant_id) ?? null,
  }));
}
