"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Entity = {
  id: string;
  name: string;
  type: string;
};

export function CreateAdButton({
  adSetId,
  entities,
}: {
  adSetId: string;
  entities: Entity[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    creative_type: "single_image",
    primary_text: "",
    headline: "",
    description: "",
    media_url: "",
    destination_url: "",
    call_to_action: "learn_more",
    advertiser_entity_id: entities[0]?.id ?? "",
  });

  function setVal<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function submit() {
    if (form.name.trim().length < 2) {
      toast.error("Donne un nom à cette publicité.");
      return;
    }
    if (form.primary_text.length === 0 || form.headline.length === 0) {
      toast.error("Texte principal + titre obligatoires.");
      return;
    }
    if (!form.advertiser_entity_id) {
      toast.error("Sélectionne une page représentée.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/ads/ads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_set_id: adSetId,
          name: form.name,
          creative_type: form.creative_type,
          primary_text: form.primary_text,
          headline: form.headline,
          description: form.description || undefined,
          media_url: form.media_url || undefined,
          destination_url: form.destination_url || undefined,
          call_to_action: form.call_to_action,
          advertiser_entity_id: form.advertiser_entity_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Création impossible.");
        return;
      }
      toast.success("Publicité créée. En attente de revue.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-night text-cream text-[12.5px] font-semibold hover:bg-night/90"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />
        Nouvelle pub
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-night/40 p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-soft-lg flex flex-col overflow-hidden max-h-[90vh]">
            <header className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-line">
              <div>
                <h2 className="text-[16px] font-semibold text-night">
                  Nouvelle publicité
                </h2>
                <p className="text-[11.5px] text-night-muted">
                  Crée une variante creative dans cet AdSet (A/B test).
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full hover:bg-night/5 text-night-dim hover:text-night flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-3.5">
              <Field label="Nom de la pub *">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setVal("name", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                  placeholder="ex: Variante creative B"
                />
              </Field>

              <Field label="Page représentée *">
                <select
                  value={form.advertiser_entity_id}
                  onChange={(e) =>
                    setVal("advertiser_entity_id", e.target.value)
                  }
                  className={inputCls}
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Format">
                <select
                  value={form.creative_type}
                  onChange={(e) => setVal("creative_type", e.target.value)}
                  className={inputCls}
                >
                  <option value="single_image">Image</option>
                  <option value="single_video">Vidéo</option>
                  <option value="carousel">Carrousel</option>
                </select>
              </Field>

              <Field label="Texte principal * (max 125)">
                <textarea
                  rows={3}
                  value={form.primary_text}
                  onChange={(e) => setVal("primary_text", e.target.value)}
                  maxLength={125}
                  className={inputCls}
                />
                <p className="text-[10.5px] text-night-muted text-right mt-1">
                  {form.primary_text.length} / 125
                </p>
              </Field>

              <Field label="Titre * (max 40)">
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setVal("headline", e.target.value)}
                  maxLength={40}
                  className={inputCls}
                />
              </Field>

              <Field label="Description (max 30)">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setVal("description", e.target.value)}
                  maxLength={30}
                  className={inputCls}
                />
              </Field>

              <Field label="URL média">
                <input
                  type="url"
                  value={form.media_url}
                  onChange={(e) => setVal("media_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>

              <Field label="URL destination">
                <input
                  type="url"
                  value={form.destination_url}
                  onChange={(e) => setVal("destination_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://monsite.com/produit"
                />
              </Field>

              <Field label="CTA">
                <select
                  value={form.call_to_action}
                  onChange={(e) => setVal("call_to_action", e.target.value)}
                  className={inputCls}
                >
                  <option value="learn_more">En savoir plus</option>
                  <option value="shop_now">Acheter</option>
                  <option value="sign_up">S&apos;inscrire</option>
                  <option value="subscribe">S&apos;abonner</option>
                  <option value="download">Télécharger</option>
                  <option value="book_now">Réserver</option>
                  <option value="apply_now">Postuler</option>
                  <option value="contact_us">Nous contacter</option>
                </select>
              </Field>
            </div>

            <footer className="px-5 sm:px-6 py-4 border-t border-line flex justify-end gap-2 bg-bg-soft/50">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-night-muted hover:text-night"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="px-5 py-2 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
              >
                {pending ? "Création…" : "Créer la pub"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
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
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
