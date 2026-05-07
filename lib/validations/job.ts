import { z } from "zod";
import { currencySchema } from "./profile";

export const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, { message: "Au moins 3 caractères." })
      .max(120, { message: "120 caractères maximum." }),
    company_name: z
      .string()
      .trim()
      .max(120, { message: "120 caractères maximum." })
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    description: z
      .string()
      .trim()
      .min(10, { message: "Au moins 10 caractères." })
      .max(8000, { message: "8000 caractères maximum." }),
    job_type: z.enum([
      "cdi",
      "cdd",
      "freelance",
      "mission",
      "alternance",
      "stage",
      "benevolat",
    ]),
    work_mode: z.enum(["on_site", "remote", "hybrid"]),
    category: z.enum([
      "tech",
      "design",
      "marketing",
      "ventes",
      "rh",
      "finance",
      "juridique",
      "conseil",
      "enseignement",
      "sante",
      "artisanat",
      "restauration",
      "transport",
      "service",
      "autre",
    ]),
    experience_level: z.enum([
      "debutant",
      "junior",
      "intermediaire",
      "senior",
      "expert",
    ]),
    salary_min: z
      .number()
      .min(0)
      .max(99_999_999)
      .nullable()
      .optional(),
    salary_max: z
      .number()
      .min(0)
      .max(99_999_999)
      .nullable()
      .optional(),
    salary_currency: currencySchema.nullable().optional(),
    salary_period: z
      .enum(["hour", "day", "month", "year", "project"])
      .nullable()
      .optional(),
    location: z
      .string()
      .trim()
      .max(120, { message: "120 caractères maximum." })
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine(
    (value) => {
      if (value.salary_min == null || value.salary_max == null) return true;
      return value.salary_min <= value.salary_max;
    },
    { message: "Le salaire min ne peut pas dépasser le max.", path: ["salary_max"] },
  )
  .refine(
    (value) =>
      (value.salary_min == null && value.salary_max == null) ||
      (value.salary_currency != null && value.salary_period != null),
    {
      message: "Choisis une devise et une période si tu indiques un salaire.",
      path: ["salary_currency"],
    },
  );

export type JobFormInput = z.infer<typeof jobFormSchema>;

export const applicationFormSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, { message: "Au moins 10 caractères." })
    .max(2000, { message: "2000 caractères maximum." }),
});

export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;
