"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBusinessAccount } from "./actions";

export function BusinessForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    legal_name: "",
    legal_form: "",
    siret: "",
    vat_number: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    industry: "",
    street: "",
    postal_code: "",
    city: "",
    country: "FR",
  });

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (form.legal_name.length < 2) {
      toast.error("Raison sociale requise.");
      return;
    }
    if (!form.primary_contact_email.includes("@")) {
      toast.error("Email valide requis.");
      return;
    }
    if (form.siret && !/^\d{14}$/.test(form.siret)) {
      toast.error("SIRET invalide (14 chiffres).");
      return;
    }
    startTransition(async () => {
      const result = await createBusinessAccount({
        legal_name: form.legal_name,
        legal_form: form.legal_form || undefined,
        siret: form.siret || undefined,
        vat_number: form.vat_number || undefined,
        primary_contact_email: form.primary_contact_email,
        primary_contact_phone: form.primary_contact_phone || undefined,
        industry: form.industry || undefined,
        billing_address: {
          street: form.street,
          postal_code: form.postal_code,
          city: form.city,
          country: form.country,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Compte entreprise créé.");
      router.push("/ads-manager/business?action=new-account");
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 space-y-4">
      <Field label="Raison sociale *">
        <input
          type="text"
          value={form.legal_name}
          onChange={(e) => update("legal_name", e.target.value)}
          maxLength={200}
          className={inputCls}
          placeholder="DIVARC SAS"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Forme juridique">
          <select
            value={form.legal_form}
            onChange={(e) => update("legal_form", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="SARL">SARL</option>
            <option value="SAS">SAS</option>
            <option value="SASU">SASU</option>
            <option value="EURL">EURL</option>
            <option value="EI">EI / Auto-entrepreneur</option>
            <option value="Association">Association loi 1901</option>
            <option value="Autre">Autre</option>
          </select>
        </Field>
        <Field label="Industrie">
          <input
            type="text"
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            maxLength={50}
            className={inputCls}
            placeholder="Tech, e-commerce, services…"
          />
        </Field>
        <Field label="SIRET (14 chiffres)">
          <input
            type="text"
            value={form.siret}
            onChange={(e) =>
              update("siret", e.target.value.replace(/\s/g, ""))
            }
            maxLength={14}
            className={inputCls}
            placeholder="12345678901234"
          />
        </Field>
        <Field label="N° TVA intra-UE">
          <input
            type="text"
            value={form.vat_number}
            onChange={(e) => update("vat_number", e.target.value)}
            maxLength={20}
            className={inputCls}
            placeholder="FR00123456789"
          />
        </Field>
        <Field label="Email contact *">
          <input
            type="email"
            value={form.primary_contact_email}
            onChange={(e) => update("primary_contact_email", e.target.value)}
            className={inputCls}
            placeholder="contact@entreprise.fr"
          />
        </Field>
        <Field label="Téléphone">
          <input
            type="tel"
            value={form.primary_contact_phone}
            onChange={(e) => update("primary_contact_phone", e.target.value)}
            maxLength={30}
            className={inputCls}
            placeholder="+33 6 XX XX XX XX"
          />
        </Field>
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted pt-2">
        Adresse de facturation
      </h3>
      <Field label="Rue *">
        <input
          type="text"
          value={form.street}
          onChange={(e) => update("street", e.target.value)}
          maxLength={200}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Code postal *">
          <input
            type="text"
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            maxLength={20}
            className={inputCls}
          />
        </Field>
        <Field label="Ville *">
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            maxLength={100}
            className={inputCls}
          />
        </Field>
        <Field label="Pays *">
          <select
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className={inputCls}
          >
            <option value="FR">France</option>
            <option value="BE">Belgique</option>
            <option value="CH">Suisse</option>
            <option value="LU">Luxembourg</option>
            <option value="CA">Canada</option>
            <option value="DE">Allemagne</option>
            <option value="ES">Espagne</option>
            <option value="IT">Italie</option>
          </select>
        </Field>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
        >
          {pending ? "Création…" : "Créer mon compte entreprise"}
        </button>
        <p className="text-[11px] text-night-muted mt-2">
          En créant ce compte, tu certifies que tu as l&apos;autorité de
          représenter l&apos;entreprise. Pour les dépenses &gt; 5 000 €/mois,
          un KYB complet (K-bis + ID dirigeant) sera demandé.
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
