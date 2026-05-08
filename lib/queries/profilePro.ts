import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfileCertification,
  ProfileEducation,
  ProfileExperience,
  ProfileLanguage,
  ProfileSkill,
} from "@/lib/database.types";

export type ProProfileBundle = {
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  skills: ProfileSkill[];
  languages: ProfileLanguage[];
  certifications: ProfileCertification[];
};

export async function getProProfile(userId: string): Promise<ProProfileBundle> {
  const supabase = await createClient();

  const [experiences, education, skills, languages, certifications] =
    await Promise.all([
      supabase
        .from("profile_experiences")
        .select("*")
        .eq("user_id", userId)
        .order("position_order", { ascending: true })
        .order("start_month", { ascending: false }),
      supabase
        .from("profile_education")
        .select("*")
        .eq("user_id", userId)
        .order("position_order", { ascending: true })
        .order("start_year", { ascending: false, nullsFirst: false }),
      supabase
        .from("profile_skills")
        .select("*")
        .eq("user_id", userId)
        .order("endorsements_count", { ascending: false })
        .order("position_order", { ascending: true }),
      supabase
        .from("profile_languages")
        .select("*")
        .eq("user_id", userId)
        .order("position_order", { ascending: true }),
      supabase
        .from("profile_certifications")
        .select("*")
        .eq("user_id", userId)
        .order("position_order", { ascending: true })
        .order("issued_month", { ascending: false, nullsFirst: false }),
    ]);

  return {
    experiences: experiences.data ?? [],
    education: education.data ?? [],
    skills: skills.data ?? [],
    languages: languages.data ?? [],
    certifications: certifications.data ?? [],
  };
}

/** Renvoie un Set des skill_id endorsées par le viewer courant (pour
 * afficher le bouton "déjà endorsé" différemment). */
export async function getMyEndorsedSkillIds(
  skillIds: string[],
): Promise<Set<string>> {
  if (skillIds.length === 0) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("skill_endorsements")
    .select("skill_id")
    .eq("endorser_id", user.id)
    .in("skill_id", skillIds);

  return new Set((data ?? []).map((row) => row.skill_id));
}
