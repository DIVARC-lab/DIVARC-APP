"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CreateCompanyState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof CreateCompanyInput, string>>;
};

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Au moins 3 caractères.")
  .max(60, "60 caractères maximum.")
  .regex(/^[a-z0-9][a-z0-9-]+$/, "Lettres minuscules, chiffres et - uniquement.");

const sizeEnum = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10000+",
]);

const companySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200).optional().transform(emptyToNull),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform(emptyToNull),
  website: z
    .string()
    .trim()
    .url("URL invalide.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  industry: z.string().trim().max(80).optional().transform(emptyToNull),
  size_label: sizeEnum.optional().or(z.literal("").transform(() => undefined)),
  headquarters: z.string().trim().max(120).optional().transform(emptyToNull),
  founded_year: z
    .union([
      z.coerce.number().int().min(1800).max(new Date().getFullYear()),
      z.literal("").transform(() => undefined),
    ])
    .optional(),
  logo_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateCompanyInput = z.infer<typeof companySchema>;

function emptyToNull(v: string | undefined) {
  if (!v || v.length === 0) return null;
  return v;
}

export async function createCompany(
  _prev: CreateCompanyState | undefined,
  formData: FormData,
): Promise<CreateCompanyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Connexion requise." };

  const parsed = companySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline") ?? "",
    description: formData.get("description") ?? "",
    website: formData.get("website") ?? "",
    industry: formData.get("industry") ?? "",
    size_label: formData.get("size_label") ?? "",
    headquarters: formData.get("headquarters") ?? "",
    founded_year: formData.get("founded_year") ?? "",
    logo_url: formData.get("logo_url") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: CreateCompanyState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k as keyof CreateCompanyInput]) {
        fieldErrors[k as keyof CreateCompanyInput] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Vérifie les champs.",
      fieldErrors,
    };
  }

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existing) {
    return {
      status: "error",
      fieldErrors: { slug: "Cet identifiant est déjà pris." },
    };
  }

  const { error } = await supabase.from("companies").insert({
    slug: parsed.data.slug,
    name: parsed.data.name,
    tagline: parsed.data.tagline ?? null,
    description: parsed.data.description ?? null,
    website: parsed.data.website ?? null,
    industry: parsed.data.industry ?? null,
    size_label: parsed.data.size_label ?? null,
    headquarters: parsed.data.headquarters ?? null,
    founded_year: parsed.data.founded_year ?? null,
    logo_url: parsed.data.logo_url ?? null,
    owner_id: user.id,
  });

  if (error) {
    return {
      status: "error",
      message: "Création impossible. Réessaie dans un instant.",
    };
  }

  revalidatePath("/companies");
  redirect(`/companies/${parsed.data.slug}`);
}

export async function followCompany(
  companyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("company_followers")
    .insert({ company_id: companyId, user_id: user.id });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false, error: "Impossible de suivre." };
  }
  revalidatePath("/companies");
  return { ok: true };
}

export async function unfollowCompany(
  companyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("company_followers")
    .delete()
    .eq("company_id", companyId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Impossible de se désabonner." };
  revalidatePath("/companies");
  return { ok: true };
}
