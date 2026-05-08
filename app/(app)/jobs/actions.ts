"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  applicationFormSchema,
  jobFormSchema,
} from "@/lib/validations/job";
import {
  flattenZodErrors,
  type FieldErrors,
} from "@/lib/validations/profile";
import type {
  ApplicationFormInput,
  JobFormInput,
} from "@/lib/validations/job";
import type { JobApplicationStatus } from "@/lib/database.types";

export type JobFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<JobFormInput>;
};

function parseJobForm(formData: FormData) {
  const salaryMin = formData.get("salary_min");
  const salaryMax = formData.get("salary_max");
  return jobFormSchema.safeParse({
    title: formData.get("title"),
    company_name: formData.get("company_name"),
    description: formData.get("description"),
    job_type: formData.get("job_type"),
    work_mode: formData.get("work_mode"),
    category: formData.get("category"),
    experience_level: formData.get("experience_level"),
    salary_min:
      typeof salaryMin === "string" && salaryMin.length > 0
        ? Number(salaryMin)
        : null,
    salary_max:
      typeof salaryMax === "string" && salaryMax.length > 0
        ? Number(salaryMax)
        : null,
    salary_currency: formData.get("salary_currency") || null,
    salary_period: formData.get("salary_period") || null,
    location: formData.get("location"),
  });
}

export async function createJob(
  _prev: JobFormState | undefined,
  formData: FormData,
): Promise<JobFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs en rouge.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  // Liaison à une page entreprise possédée par l'utilisateur (optionnel)
  const companyIdRaw = formData.get("company_id");
  let companyId: string | null = null;
  let companyName = parsed.data.company_name;
  if (typeof companyIdRaw === "string" && companyIdRaw.length > 0) {
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", companyIdRaw)
      .maybeSingle();
    if (company && company.owner_id === user.id) {
      companyId = company.id;
      // Si pas de nom saisi, on prend celui de la page
      if (!companyName) companyName = company.name;
    }
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      title: parsed.data.title,
      company_name: companyName,
      company_id: companyId,
      description: parsed.data.description,
      job_type: parsed.data.job_type,
      work_mode: parsed.data.work_mode,
      category: parsed.data.category,
      experience_level: parsed.data.experience_level,
      location: parsed.data.location,
      salary_min: parsed.data.salary_min ?? null,
      salary_max: parsed.data.salary_max ?? null,
      salary_currency: parsed.data.salary_currency ?? null,
      salary_period: parsed.data.salary_period ?? null,
      poster_id: user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !job) {
    return { status: "error", message: "Publication impossible. Réessaie." };
  }

  revalidatePath("/jobs");
  revalidatePath("/jobs/mine");
  redirect(`/jobs/${job.id}`);
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("poster_id", user.id);

  revalidatePath("/jobs");
  revalidatePath("/jobs/mine");
  return { ok: true };
}

export async function closeJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("jobs")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("poster_id", user.id);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs/mine");
  revalidatePath("/jobs");
  return { ok: true };
}

export async function reopenJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("jobs")
    .update({ status: "active", closed_at: null })
    .eq("id", jobId)
    .eq("poster_id", user.id);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs/mine");
  revalidatePath("/jobs");
  return { ok: true };
}

export type ApplicationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<ApplicationFormInput>;
};

export async function applyToJob(
  jobId: string,
  _prev: ApplicationFormState | undefined,
  formData: FormData,
): Promise<ApplicationFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  const parsed = applicationFormSchema.safeParse({
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { error } = await supabase.from("job_applications").insert({
    job_id: jobId,
    applicant_id: user.id,
    message: parsed.data.message,
  });

  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return { status: "error", message: "Tu as déjà postulé à cette offre." };
    }
    return { status: "error", message: "Candidature impossible. Réessaie." };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs/applied");
  return { status: "success", message: "Candidature envoyée ✨" };
}

export async function withdrawApplication(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("job_applications")
    .update({ status: "withdrawn", responded_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("applicant_id", user.id);

  revalidatePath("/jobs/applied");
  return { ok: true };
}

export async function reviewApplication(
  applicationId: string,
  newStatus: JobApplicationStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // Verify that user owns the related job
  const { data: app } = await supabase
    .from("job_applications")
    .select("job_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) return { ok: false };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, poster_id")
    .eq("id", app.job_id)
    .maybeSingle();

  if (!job || job.poster_id !== user.id) return { ok: false };

  await supabase
    .from("job_applications")
    .update({ status: newStatus })
    .eq("id", applicationId);

  revalidatePath(`/jobs/${app.job_id}/applicants`);
  return { ok: true };
}

export async function toggleSaveJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, saved: false };

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, saved: false };
  }

  await supabase
    .from("saved_jobs")
    .insert({ user_id: user.id, job_id: jobId });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true, saved: true };
}
