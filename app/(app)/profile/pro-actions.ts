"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null as string | null };
  return { supabase, userId: user.id };
}

function refreshProfile() {
  revalidatePath("/profile");
}

// ============================================================
// Toggles open_to_work / open_to_hiring / discrete_search / headline
// ============================================================

const proHeaderSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  open_to_work: z.boolean(),
  open_to_hiring: z.boolean(),
  discrete_search: z.boolean(),
});

export type ProHeaderState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateProHeader(
  _prev: ProHeaderState | undefined,
  formData: FormData,
): Promise<ProHeaderState> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { status: "error", message: "Connexion requise." };

  const parsed = proHeaderSchema.safeParse({
    headline: formData.get("headline"),
    open_to_work: formData.get("open_to_work") === "on",
    open_to_hiring: formData.get("open_to_hiring") === "on",
    discrete_search: formData.get("discrete_search") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Vérifie les champs." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", userId);

  if (error) return { status: "error", message: "Enregistrement impossible." };

  refreshProfile();
  return { status: "success", message: "Profil pro à jour." };
}

// ============================================================
// Expériences
// ============================================================

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format YYYY-MM attendu.")
  .transform((v) => `${v}-01`);

const experienceSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    company_name: z.string().trim().min(1).max(120),
    employment_type: z
      .enum(["cdi", "cdd", "freelance", "mission", "alternance", "stage", "benevolat"])
      .nullable()
      .optional(),
    work_mode: z.enum(["on_site", "remote", "hybrid"]).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    start_month: monthSchema,
    end_month: z
      .union([monthSchema, z.literal("").transform(() => null), z.null()])
      .optional(),
    is_current: z.boolean(),
  })
  .refine(
    (v) => v.is_current || v.end_month,
    { message: "Indique une date de fin ou coche 'poste actuel'." },
  );

function readExperienceForm(formData: FormData) {
  return {
    title: formData.get("title"),
    company_name: formData.get("company_name"),
    employment_type: formData.get("employment_type") || null,
    work_mode: formData.get("work_mode") || null,
    location: formData.get("location") || null,
    description: formData.get("description") || null,
    start_month: formData.get("start_month") ?? "",
    end_month: formData.get("end_month") ?? "",
    is_current: formData.get("is_current") === "on",
  };
}

export async function createExperience(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = experienceSchema.safeParse(readExperienceForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const data = parsed.data;
  const { error } = await supabase.from("profile_experiences").insert({
    user_id: userId,
    title: data.title,
    company_name: data.company_name,
    employment_type: data.employment_type ?? null,
    work_mode: data.work_mode ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    start_month: data.start_month,
    end_month: data.is_current ? null : (data.end_month as string | null),
    is_current: data.is_current,
  });

  if (error) return { ok: false, error: "Ajout impossible." };
  refreshProfile();
  return { ok: true };
}

export async function updateExperience(
  experienceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = experienceSchema.safeParse(readExperienceForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("profile_experiences")
    .update({
      title: data.title,
      company_name: data.company_name,
      employment_type: data.employment_type ?? null,
      work_mode: data.work_mode ?? null,
      location: data.location ?? null,
      description: data.description ?? null,
      start_month: data.start_month,
      end_month: data.is_current ? null : (data.end_month as string | null),
      is_current: data.is_current,
    })
    .eq("id", experienceId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Modification impossible." };
  refreshProfile();
  return { ok: true };
}

export async function deleteExperience(experienceId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("profile_experiences")
    .delete()
    .eq("id", experienceId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Suppression impossible." };
  refreshProfile();
  return { ok: true };
}

// ============================================================
// Formations
// ============================================================

const educationSchema = z.object({
  school: z.string().trim().min(1).max(160),
  degree: z.string().trim().max(120).nullable().optional(),
  field_of_study: z.string().trim().max(120).nullable().optional(),
  start_year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  end_year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

function readEducationForm(formData: FormData) {
  return {
    school: formData.get("school"),
    degree: formData.get("degree") || null,
    field_of_study: formData.get("field_of_study") || null,
    start_year: formData.get("start_year") || null,
    end_year: formData.get("end_year") || null,
    description: formData.get("description") || null,
  };
}

export async function createEducation(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = educationSchema.safeParse(readEducationForm(formData));
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const { error } = await supabase.from("profile_education").insert({
    user_id: userId,
    school: parsed.data.school,
    degree: parsed.data.degree ?? null,
    field_of_study: parsed.data.field_of_study ?? null,
    start_year: parsed.data.start_year ?? null,
    end_year: parsed.data.end_year ?? null,
    description: parsed.data.description ?? null,
  });

  if (error) return { ok: false, error: "Ajout impossible." };
  refreshProfile();
  return { ok: true };
}

export async function updateEducation(
  educationId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = educationSchema.safeParse(readEducationForm(formData));
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const { error } = await supabase
    .from("profile_education")
    .update({
      school: parsed.data.school,
      degree: parsed.data.degree ?? null,
      field_of_study: parsed.data.field_of_study ?? null,
      start_year: parsed.data.start_year ?? null,
      end_year: parsed.data.end_year ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("id", educationId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Modification impossible." };
  refreshProfile();
  return { ok: true };
}

export async function deleteEducation(educationId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("profile_education")
    .delete()
    .eq("id", educationId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Suppression impossible." };
  refreshProfile();
  return { ok: true };
}

// ============================================================
// Compétences
// ============================================================

const skillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable().optional(),
});

export async function createSkill(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = skillSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level") || null,
  });
  if (!parsed.success) return { ok: false, error: "Compétence invalide." };

  const { error } = await supabase.from("profile_skills").insert({
    user_id: userId,
    name: parsed.data.name,
    level: parsed.data.level ?? null,
  });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "Tu as déjà cette compétence." };
    }
    return { ok: false, error: "Ajout impossible." };
  }
  refreshProfile();
  return { ok: true };
}

export async function deleteSkill(skillId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("profile_skills")
    .delete()
    .eq("id", skillId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Suppression impossible." };
  refreshProfile();
  return { ok: true };
}

// ============================================================
// Endorsements (sur skill d'autrui)
// ============================================================

export async function endorseSkill(skillId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("skill_endorsements")
    .insert({ skill_id: skillId, endorser_id: userId });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "Déjà endorsé." };
    }
    return { ok: false, error: "Endorsement impossible." };
  }
  return { ok: true };
}

export async function unendorseSkill(skillId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("skill_endorsements")
    .delete()
    .eq("skill_id", skillId)
    .eq("endorser_id", userId);

  if (error) return { ok: false, error: "Retrait impossible." };
  return { ok: true };
}

// ============================================================
// Langues
// ============================================================

const languageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "native"]),
});

export async function createLanguage(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = languageSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) return { ok: false, error: "Langue invalide." };

  const { error } = await supabase.from("profile_languages").insert({
    user_id: userId,
    name: parsed.data.name,
    level: parsed.data.level,
  });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "Tu as déjà cette langue." };
    }
    return { ok: false, error: "Ajout impossible." };
  }
  refreshProfile();
  return { ok: true };
}

export async function deleteLanguage(languageId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("profile_languages")
    .delete()
    .eq("id", languageId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Suppression impossible." };
  refreshProfile();
  return { ok: true };
}

// ============================================================
// Certifications
// ============================================================

const certificationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().min(1).max(120),
  issued_month: z
    .union([monthSchema, z.literal("").transform(() => null), z.null()])
    .optional(),
  expires_month: z
    .union([monthSchema, z.literal("").transform(() => null), z.null()])
    .optional(),
  credential_url: z
    .string()
    .trim()
    .url()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export async function createCertification(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = certificationSchema.safeParse({
    name: formData.get("name"),
    issuer: formData.get("issuer"),
    issued_month: formData.get("issued_month") ?? "",
    expires_month: formData.get("expires_month") ?? "",
    credential_url: formData.get("credential_url") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Certification invalide (URL ?)." };
  }

  const { error } = await supabase.from("profile_certifications").insert({
    user_id: userId,
    name: parsed.data.name,
    issuer: parsed.data.issuer,
    issued_month: (parsed.data.issued_month as string | null) ?? null,
    expires_month: (parsed.data.expires_month as string | null) ?? null,
    credential_url: (parsed.data.credential_url as string | null) ?? null,
  });

  if (error) return { ok: false, error: "Ajout impossible." };
  refreshProfile();
  return { ok: true };
}

export async function deleteCertification(certId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("profile_certifications")
    .delete()
    .eq("id", certId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "Suppression impossible." };
  refreshProfile();
  return { ok: true };
}
