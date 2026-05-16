"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/* Sprint Auth Onboarding — Inscription Facebook-style.
 *
 * Champs requis :
 *  - email, password (Supabase auth)
 *  - fullName (raw_user_meta_data → trigger handle_new_user)
 *  - username (validé unique côté server avant signUp)
 *  - phoneNumber (optionnel V1, format libre — validation E.164 V2)
 *  - dateOfBirth (combinaison year + month + day, ISO YYYY-MM-DD)
 *  - gender (whitelist)
 *  - locationCity (optionnel)
 *
 * Toutes ces données partent dans options.data du auth.signUp et sont
 * lues par le trigger DB handle_new_user (migration 0148) qui crée la
 * ligne profiles correspondante.
 */

const GENDERS = [
  "female",
  "male",
  "non_binary",
  "other",
  "prefer_not_to_say",
] as const;
type Gender = (typeof GENDERS)[number];

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const PHONE_REGEX = /^[+\d][\d\s().-]{6,20}$/;

export type SignupState = { error?: string } | undefined;

export async function signUp(
  _state: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const birthYear = String(formData.get("birthYear") ?? "").trim();
  const birthMonth = String(formData.get("birthMonth") ?? "").trim();
  const birthDay = String(formData.get("birthDay") ?? "").trim();
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const locationCity = String(formData.get("locationCity") ?? "").trim();

  /* Validation côté serveur (en plus de la validation HTML5 du form). */
  if (!email || !email.includes("@")) {
    return { error: "Email invalide." };
  }
  if (!password || password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (!fullName || fullName.length < 2) {
    return { error: "Saisis ton nom complet." };
  }
  if (!USERNAME_REGEX.test(usernameRaw)) {
    return {
      error:
        "Nom d'utilisateur invalide : 3-30 caractères, lettres minuscules, chiffres et underscores uniquement.",
    };
  }
  if (phoneNumber && !PHONE_REGEX.test(phoneNumber)) {
    return {
      error:
        "Numéro de téléphone invalide. Inclus l'indicatif pays (ex: +33 6 12 34 56 78).",
    };
  }

  /* Date de naissance. On accepte birthDay vide pour V1 (par défaut 1er
     du mois) — l'user n'est pas obligé de donner le jour exact. */
  let dateOfBirthIso: string | null = null;
  if (birthYear && birthMonth) {
    const y = Number(birthYear);
    const m = Number(birthMonth);
    const d = birthDay ? Number(birthDay) : 1;
    if (
      !Number.isInteger(y) ||
      !Number.isInteger(m) ||
      !Number.isInteger(d) ||
      y < 1900 ||
      m < 1 || m > 12 ||
      d < 1 || d > 31
    ) {
      return { error: "Date de naissance invalide." };
    }
    /* Vérifie >=13 ans (TOS DIVARC + RGPD). */
    const now = new Date();
    const ageYears =
      now.getFullYear() - y -
      (now.getMonth() + 1 < m ||
      (now.getMonth() + 1 === m && now.getDate() < d)
        ? 1
        : 0);
    if (ageYears < 13) {
      return { error: "Tu dois avoir au moins 13 ans pour t'inscrire." };
    }
    if (ageYears > 120) {
      return { error: "Date de naissance invalide." };
    }
    dateOfBirthIso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } else if (birthYear || birthMonth) {
    return { error: "Précise au moins l'année et le mois de naissance." };
  }

  const gender: Gender | null = (GENDERS as readonly string[]).includes(
    genderRaw,
  )
    ? (genderRaw as Gender)
    : null;

  /* Vérification d'unicité du username avant le auth.signUp pour éviter
     une race avec le trigger DB. */
  const supabase = await createClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: usernameTaken } = await (supabase as any).rpc(
    "check_username_available",
    { p_username: usernameRaw },
  );
  if (usernameTaken === false) {
    return { error: "Ce nom d'utilisateur est déjà pris. Essaies-en un autre." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "divarc.app"}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: usernameRaw,
        phone_number: phoneNumber || null,
        date_of_birth: dateOfBirthIso,
        gender,
        location_city: locationCity || null,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?confirmation=sent");
}
