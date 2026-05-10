"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAdAccount } from "./actions";

export function AdAccountForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "GBP" | "CAD" | "CHF">(
    "EUR",
  );
  const [industry, setIndustry] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");

  function submit() {
    if (name.length < 2) {
      toast.error("Nom requis.");
      return;
    }
    startTransition(async () => {
      const result = await createAdAccount({
        business_account_id: businessId,
        name,
        currency,
        industry: industry || undefined,
        spend_limit_daily: dailyLimit ? Number(dailyLimit) : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Compte publicitaire créé.");
      router.push(`/ads-manager/${result.data!.id}`);
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-5 space-y-4">
      <p className="text-[12.5px] text-night-muted leading-relaxed">
        Un compte publicitaire = une marque ou un produit. Tu peux en créer
        plusieurs si tu opères plusieurs marques distinctes (ex: une SAS qui
        gère deux e-commerces).
      </p>
      <Field label="Nom du compte *">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className={inputCls}
          placeholder='ex: "Marque principale", "Boutique sport"'
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Devise">
          <select
            value={currency}
            onChange={(e) =>
              setCurrency(e.target.value as typeof currency)
            }
            className={inputCls}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="CHF">CHF</option>
          </select>
        </Field>
        <Field label="Industrie">
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            maxLength={50}
            className={inputCls}
          />
        </Field>
        <Field label="Limite quotidienne (€) — optionnel">
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            min={0}
            step={10}
            className={inputCls}
            placeholder="ex: 200"
          />
        </Field>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
      >
        {pending ? "Création…" : "Créer le compte publicitaire"}
      </button>
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
