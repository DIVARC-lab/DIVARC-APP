"use client";

import {
  Activity,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Globe2,
  Heart,
  Languages,
  Layers3,
  MapPin,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  UserPlus2,
  Users,
  Users2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AudienceConnections,
  BehaviorEntry,
  CampaignFormState,
  CityRef,
  CustomLocation,
  LookalikeDraft,
} from "./types";

/* AudienceBuilder — wizard riche 7 panels inspiré Meta + Google Ads.
 *
 * Panels (chacun dépliable, ordonnés du plus à moins courant) :
 *   A. Localisations    — pays / régions / villes / zones radius
 *   B. Démographie      — âge / genre / langues
 *   C. Centres intérêt  — recherche + suggestions IA
 *   D. Comportements    — recsys DIVARC (acheteurs marketplace, jobseekers...)
 *   E. Connections      — friends_of_engagers / exclude_fans
 *   F. Custom audiences — saved / pixel / list / engagement (+ exclusions)
 *   G. Lookalikes       — seed + countries + size_pct (1-10)
 *
 * NB : l'estimation reach est gérée par le parent CampaignBuilderPro dans
 * sa sidebar sticky de droite (AudienceMeter). On reste full-width ici.
 */

type SavedAudience = {
  id: string;
  name: string;
  type: string;
  estimated_size: number | null;
};

type Props = {
  accountId: string;
  form: CampaignFormState;
  setForm: (next: CampaignFormState) => void;
  validationErrors: string[];
  validationWarnings: string[];
};

export function AudienceBuilder({
  accountId,
  form,
  setForm,
  validationErrors,
  validationWarnings,
}: Props) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    location: true,
    demographics: true,
    interests: true,
    behaviors: false,
    connections: false,
    custom: false,
    lookalike: false,
  });
  const togglePanel = (k: string) =>
    setOpenPanels((p) => ({ ...p, [k]: !p[k] }));

  const update = (patch: Partial<CampaignFormState>) =>
    setForm({ ...form, ...patch });

  /* === Saved audiences (custom + lookalikes) — fetch async === */
  const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/ads/audiences/list?account=${accountId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { audiences?: SavedAudience[] };
        if (!cancelled) setSavedAudiences(json.audiences ?? []);
      } catch {
        /* silent — endpoint optionnel V1. */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return (
    <div className="space-y-3 min-w-0">
      {/* === 7 panels — pleine largeur (l'estimation est gérée par la
           sidebar sticky du parent CampaignBuilderPro) === */}
      <Panel
        id="location"
        icon={MapPin}
        title="Localisations"
        subtitle={summarizeLocations(form)}
        open={openPanels.location}
        onToggle={() => togglePanel("location")}
      >
        <LocationPanel form={form} update={update} />
      </Panel>

      <Panel
        id="demographics"
        icon={Users}
        title="Démographie"
        subtitle={`${form.age_min}–${form.age_max} ans · ${labelGender(form.genders)}${form.languages.length > 0 ? ` · ${form.languages.length} langue(s)` : ""}`}
        open={openPanels.demographics}
        onToggle={() => togglePanel("demographics")}
      >
        <DemographicsPanel form={form} update={update} />
      </Panel>

      <Panel
        id="interests"
        icon={Heart}
        title="Centres d'intérêt"
        subtitle={
          form.interests.trim().length > 0
            ? `${form.interests.split(",").filter((s) => s.trim()).length} intérêt(s) · ${form.interests_logic === "and" ? "ET" : "OU"}`
            : "Aucun intérêt sélectionné"
        }
        open={openPanels.interests}
        onToggle={() => togglePanel("interests")}
      >
        <InterestsPanel form={form} update={update} />
      </Panel>

      <Panel
        id="behaviors"
        icon={Activity}
        title="Comportements"
        subtitle={
          form.behaviors.length > 0
            ? `${form.behaviors.length} comportement(s)`
            : "Aucun"
        }
        open={openPanels.behaviors}
        onToggle={() => togglePanel("behaviors")}
      >
        <BehaviorsPanel form={form} update={update} />
      </Panel>

      <Panel
        id="connections"
        icon={UserPlus2}
        title="Connections"
        subtitle={summarizeConnections(form.connections)}
        open={openPanels.connections}
        onToggle={() => togglePanel("connections")}
      >
        <ConnectionsPanel form={form} update={update} />
      </Panel>

      <Panel
        id="custom"
        icon={Users2}
        title="Audiences personnalisées"
        subtitle={`${form.custom_audience_ids.length} incluse(s) · ${form.excluded_custom_audience_ids.length} exclue(s)`}
        open={openPanels.custom}
        onToggle={() => togglePanel("custom")}
      >
        <CustomAudiencePanel
          form={form}
          update={update}
          saved={savedAudiences.filter((a) => a.type !== "lookalike")}
        />
      </Panel>

      <Panel
        id="lookalike"
        icon={Sparkles}
        title="Lookalikes"
        subtitle={
          form.lookalike_audience_ids.length > 0
            ? `${form.lookalike_audience_ids.length} similaire(s) sélectionné(es)`
            : form.lookalike_draft
              ? "Brouillon en cours"
              : "Aucun lookalike"
        }
        open={openPanels.lookalike}
        onToggle={() => togglePanel("lookalike")}
      >
        <LookalikePanel form={form} update={update} saved={savedAudiences} />
      </Panel>

      {/* Special category disclaimer côté builder. */}
      <div className="rounded-2xl bg-bg-soft border border-line p-4">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Catégorie spéciale (anti-discrimination)
        </p>
        <p className="text-[11.5px] text-night-soft mb-2 leading-snug">
          Logement, emploi, crédit ou sujet social/politique → restrictions
          DSA + droit anti-discrimination FR/EU. Genre forcé = all, ciblage
          géo restreint.
        </p>
        <select
          value={form.special_ad_category}
          onChange={(e) => update({ special_ad_category: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-night/20"
        >
          <option value="">Aucune (par défaut)</option>
          <option value="housing">Logement</option>
          <option value="employment">Emploi</option>
          <option value="credit">Crédit / Finance</option>
          <option value="social">Sujet social / politique</option>
        </select>
      </div>

      {/* Erreurs/warnings de conformité — affichés sous les panels (la
          sidebar parent porte l'estimation reach + jauge). */}
      {validationErrors.length > 0 ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[11.5px] text-red-800">
          <p className="font-bold mb-1">Conformité ciblage :</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {validationErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {validationWarnings.length > 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11.5px] text-amber-900">
          <p className="font-bold mb-1">Attention :</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {validationWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * Panel wrapper — header + collapse
 * ============================================================ */

function Panel({
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: typeof MapPin;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-soft transition-colors text-left"
      >
        <span
          aria-hidden
          className="w-8 h-8 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
        >
          <Icon className="w-[15px] h-[15px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-night truncate">
            {title}
          </span>
          <span className="block text-[11.5px] text-night-muted truncate">
            {subtitle}
          </span>
        </span>
        {open ? (
          <ChevronUp
            className="w-[16px] h-[16px] text-night-muted shrink-0"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className="w-[16px] h-[16px] text-night-muted shrink-0"
            aria-hidden
          />
        )}
      </button>
      {open ? (
        <div className="px-4 pb-4 pt-1 border-t border-line">{children}</div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * Panel A — Locations
 * ============================================================ */

const COUNTRY_OPTIONS = [
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "BE", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", flag: "🇨🇭", name: "Suisse" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "DE", flag: "🇩🇪", name: "Allemagne" },
  { code: "ES", flag: "🇪🇸", name: "Espagne" },
  { code: "IT", flag: "🇮🇹", name: "Italie" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "NL", flag: "🇳🇱", name: "Pays-Bas" },
];

function LocationPanel({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
}) {
  const [cityName, setCityName] = useState("");
  const [cityRadius, setCityRadius] = useState("25");
  const [postalCode, setPostalCode] = useState("");
  const [customLocLat, setCustomLocLat] = useState("");
  const [customLocLng, setCustomLocLng] = useState("");
  const [customLocRadius, setCustomLocRadius] = useState("10");
  const [customLocName, setCustomLocName] = useState("");

  const toggleCountry = (code: string) => {
    const next = form.countries.includes(code)
      ? form.countries.filter((c) => c !== code)
      : [...form.countries, code];
    if (next.length === 0) return; // au moins 1 pays requis
    update({ countries: next });
  };

  const addCity = () => {
    const name = cityName.trim();
    if (name.length < 2 || form.countries[0] === undefined) return;
    const city: CityRef = {
      name,
      country: form.countries[0],
      radius_km: Number(cityRadius) || undefined,
    };
    update({ cities: [...form.cities, city] });
    setCityName("");
  };
  const removeCity = (idx: number) =>
    update({ cities: form.cities.filter((_, i) => i !== idx) });

  const addPostal = () => {
    const pc = postalCode.trim();
    if (pc.length < 2 || form.postal_codes.includes(pc)) return;
    update({ postal_codes: [...form.postal_codes, pc] });
    setPostalCode("");
  };
  const removePostal = (pc: string) =>
    update({ postal_codes: form.postal_codes.filter((p) => p !== pc) });

  const addCustomLocation = () => {
    const lat = Number(customLocLat);
    const lng = Number(customLocLng);
    const radius = Number(customLocRadius);
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      Number.isNaN(radius) ||
      radius <= 0
    )
      return;
    const loc: CustomLocation = {
      lat,
      lng,
      radius_km: radius,
      name: customLocName.trim() || undefined,
    };
    update({ custom_locations: [...form.custom_locations, loc] });
    setCustomLocLat("");
    setCustomLocLng("");
    setCustomLocName("");
  };
  const removeCustomLocation = (idx: number) =>
    update({
      custom_locations: form.custom_locations.filter((_, i) => i !== idx),
    });

  const toggleLocationType = (t: "home" | "recent" | "travel_in") => {
    const next = form.location_types.includes(t)
      ? form.location_types.filter((x) => x !== t)
      : [...form.location_types, t];
    if (next.length === 0) return; // au moins 1 type
    update({ location_types: next });
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Pays. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          <Globe2 className="inline w-[12px] h-[12px] mr-1" aria-hidden />
          Pays ({form.countries.length})
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COUNTRY_OPTIONS.map((c) => {
            const active = form.countries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCountry(c.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night-muted border-line hover:bg-bg-soft"
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Villes + radius. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Villes (ciblage radius)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="ex: Paris"
            className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-night/20"
          />
          <input
            type="number"
            value={cityRadius}
            onChange={(e) => setCityRadius(e.target.value)}
            min={1}
            max={80}
            className="w-20 px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
            title="Rayon en km"
          />
          <span className="self-center text-[11.5px] text-night-muted">km</span>
          <button
            type="button"
            onClick={addCity}
            disabled={cityName.trim().length < 2}
            className="px-3 py-2 rounded-lg bg-night text-cream text-[12px] font-semibold disabled:opacity-40"
          >
            <Plus className="w-[14px] h-[14px]" aria-hidden />
          </button>
        </div>
        {form.cities.length > 0 ? (
          <ul className="space-y-1">
            {form.cities.map((c, idx) => (
              <li
                key={`${c.name}-${idx}`}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-bg-soft text-[12px]"
              >
                <span>
                  📍 {c.name} ({c.country})
                  {c.radius_km ? ` · +${c.radius_km} km` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeCity(idx)}
                  className="text-night-muted hover:text-red-600"
                  aria-label="Retirer"
                >
                  <X className="w-[13px] h-[13px]" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Postal codes. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Codes postaux
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="ex: 75001"
            className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
            maxLength={10}
          />
          <button
            type="button"
            onClick={addPostal}
            disabled={postalCode.trim().length < 2}
            className="px-3 py-2 rounded-lg bg-night text-cream text-[12px] font-semibold disabled:opacity-40"
          >
            <Plus className="w-[14px] h-[14px]" aria-hidden />
          </button>
        </div>
        {form.postal_codes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {form.postal_codes.map((pc) => (
              <span
                key={pc}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-bg-soft text-[11.5px]"
              >
                {pc}
                <button
                  type="button"
                  onClick={() => removePostal(pc)}
                  className="text-night-muted hover:text-red-600"
                  aria-label={`Retirer ${pc}`}
                >
                  <X className="w-[11px] h-[11px]" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Custom locations radius (lat/lng). */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          <Radio className="inline w-[12px] h-[12px] mr-1" aria-hidden />
          Zones radius (lat/lng)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
          <input
            type="number"
            step="0.0001"
            value={customLocLat}
            onChange={(e) => setCustomLocLat(e.target.value)}
            placeholder="Lat"
            className="px-2 py-2 rounded-lg border border-line text-[12.5px]"
          />
          <input
            type="number"
            step="0.0001"
            value={customLocLng}
            onChange={(e) => setCustomLocLng(e.target.value)}
            placeholder="Lng"
            className="px-2 py-2 rounded-lg border border-line text-[12.5px]"
          />
          <input
            type="number"
            value={customLocRadius}
            onChange={(e) => setCustomLocRadius(e.target.value)}
            min={1}
            max={80}
            placeholder="km"
            className="px-2 py-2 rounded-lg border border-line text-[12.5px]"
          />
          <input
            type="text"
            value={customLocName}
            onChange={(e) => setCustomLocName(e.target.value)}
            placeholder="Nom (opt.)"
            className="px-2 py-2 rounded-lg border border-line text-[12.5px] sm:col-span-1"
          />
          <button
            type="button"
            onClick={addCustomLocation}
            disabled={!customLocLat || !customLocLng}
            className="px-3 py-2 rounded-lg bg-night text-cream text-[12px] font-semibold disabled:opacity-40 sm:col-span-1"
          >
            Ajouter
          </button>
        </div>
        {form.custom_locations.length > 0 ? (
          <ul className="space-y-1">
            {form.custom_locations.map((l, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-bg-soft text-[12px]"
              >
                <span>
                  🎯 {l.name ? `${l.name} · ` : ""}
                  {l.lat.toFixed(4)}, {l.lng.toFixed(4)} ({l.radius_km} km)
                </span>
                <button
                  type="button"
                  onClick={() => removeCustomLocation(idx)}
                  className="text-night-muted hover:text-red-600"
                  aria-label="Retirer"
                >
                  <X className="w-[13px] h-[13px]" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Location types. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Type de présence
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "home" as const, label: "Habitent ici" },
              { id: "recent" as const, label: "Récemment ici" },
              { id: "travel_in" as const, label: "En voyage ici" },
            ]
          ).map((t) => {
            const active = form.location_types.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleLocationType(t.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night-muted border-line hover:bg-bg-soft"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Panel B — Demographics
 * ============================================================ */

const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

function DemographicsPanel({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
}) {
  const isLocked = !!form.special_ad_category && form.special_ad_category !== "";

  const toggleLanguage = (code: string) =>
    update({
      languages: form.languages.includes(code)
        ? form.languages.filter((l) => l !== code)
        : [...form.languages, code],
    });

  return (
    <div className="space-y-4 pt-3">
      {isLocked ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11.5px] text-amber-800">
          <AlertTriangle
            className="inline w-[12px] h-[12px] mr-1"
            aria-hidden
          />
          Catégorie spéciale active : genre forcé sur « Tous » par
          anti-discrimination.
        </div>
      ) : null}

      {/* Âge — double slider. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Tranche d&apos;âge ({form.age_min}–{form.age_max} ans)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="range"
              min={18}
              max={99}
              value={form.age_min}
              onChange={(e) =>
                update({
                  age_min: Math.min(Number(e.target.value), form.age_max),
                })
              }
              className="w-full accent-night"
            />
            <p className="text-[10.5px] text-night-muted mt-0.5 text-center">
              Min : {form.age_min}
            </p>
          </div>
          <div>
            <input
              type="range"
              min={18}
              max={99}
              value={form.age_max}
              onChange={(e) =>
                update({
                  age_max: Math.max(Number(e.target.value), form.age_min),
                })
              }
              className="w-full accent-night"
            />
            <p className="text-[10.5px] text-night-muted mt-0.5 text-center">
              Max : {form.age_max}
            </p>
          </div>
        </div>
        <p className="text-[10.5px] text-night-muted mt-1">
          Minimum 18 ans (DSA art. 28).
        </p>
      </div>

      {/* Genre. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          Genre
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "Tous" },
              { id: "male", label: "Hommes" },
              { id: "female", label: "Femmes" },
              { id: "non_binary", label: "Non-binaires" },
            ]
          ).map((g) => {
            const active = form.genders.includes(g.id);
            const disabled = isLocked && g.id !== "all";
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  if (g.id === "all") {
                    update({ genders: ["all"] });
                  } else {
                    const next = active
                      ? form.genders.filter((x) => x !== g.id)
                      : [...form.genders.filter((x) => x !== "all"), g.id];
                    update({ genders: next.length === 0 ? ["all"] : next });
                  }
                }}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night-muted border-line hover:bg-bg-soft"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Langues. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
          <Languages className="inline w-[12px] h-[12px] mr-1" aria-hidden />
          Langues parlées (vide = toutes)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((l) => {
            const active = form.languages.includes(l.code);
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => toggleLanguage(l.code)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night-muted border-line hover:bg-bg-soft"
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Panel C — Interests (avec suggestions IA)
 * ============================================================ */

const INTEREST_SUGGESTIONS: Array<{ id: string; label: string; group: string }> = [
  { id: "tech.web_dev", label: "Web dev", group: "Tech" },
  { id: "tech.mobile_dev", label: "Mobile dev", group: "Tech" },
  { id: "tech.ai_ml", label: "IA / ML", group: "Tech" },
  { id: "tech.devops", label: "DevOps", group: "Tech" },
  { id: "lifestyle.cooking", label: "Cuisine", group: "Lifestyle" },
  { id: "lifestyle.travel", label: "Voyages", group: "Lifestyle" },
  { id: "lifestyle.fashion", label: "Mode", group: "Lifestyle" },
  { id: "lifestyle.beauty", label: "Beauté", group: "Lifestyle" },
  { id: "sport.running", label: "Course à pied", group: "Sport" },
  { id: "sport.football", label: "Football", group: "Sport" },
  { id: "sport.fitness", label: "Fitness", group: "Sport" },
  { id: "business.entrepreneurship", label: "Entrepreneuriat", group: "Business" },
  { id: "business.marketing", label: "Marketing", group: "Business" },
  { id: "business.real_estate", label: "Immobilier", group: "Business" },
  { id: "education.languages", label: "Langues", group: "Éducation" },
  { id: "education.coding", label: "Apprendre à coder", group: "Éducation" },
  { id: "arts.music", label: "Musique", group: "Arts" },
  { id: "arts.photography", label: "Photographie", group: "Arts" },
  { id: "arts.cinema", label: "Cinéma", group: "Arts" },
];

function InterestsPanel({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
}) {
  const [search, setSearch] = useState("");

  const selected = form.interests
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggle = (id: string) => {
    const isIn = selected.includes(id);
    const next = isIn
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    update({ interests: next.join(", ") });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INTEREST_SUGGESTIONS;
    return INTEREST_SUGGESTIONS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q),
    );
  }, [search]);

  /* Group by category. */
  const byGroup = useMemo(() => {
    const m = new Map<string, typeof INTEREST_SUGGESTIONS>();
    for (const i of filtered) {
      if (!m.has(i.group)) m.set(i.group, []);
      m.get(i.group)!.push(i);
    }
    return m;
  }, [filtered]);

  return (
    <div className="space-y-3 pt-3">
      <p className="text-[11.5px] text-night-muted leading-snug">
        Catégories sensibles (santé, religion, politique, sexualité, ethnicité,
        syndicats) interdites par RGPD art. 9.
      </p>

      {/* Recherche. */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-night-muted"
          aria-hidden
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un intérêt…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-night/20"
        />
      </div>

      {/* Sélectionnés. */}
      {selected.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted">
              Sélectionnés ({selected.length})
            </span>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-0.5">
              <button
                type="button"
                onClick={() => update({ interests_logic: "or" })}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  form.interests_logic === "or"
                    ? "bg-night text-cream"
                    : "text-night-muted"
                }`}
              >
                OU
              </button>
              <button
                type="button"
                onClick={() => update({ interests_logic: "and" })}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  form.interests_logic === "and"
                    ? "bg-night text-cream"
                    : "text-night-muted"
                }`}
              >
                ET
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night text-cream text-[11.5px]"
              >
                {labelInterest(id)}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:text-amber-300"
                  aria-label={`Retirer ${id}`}
                >
                  <X className="w-[11px] h-[11px]" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Catalogue groupé. */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {[...byGroup.entries()].map(([group, items]) => (
          <div key={group}>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              {group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((i) => {
                const active = selected.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggle(i.id)}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] border transition-colors ${
                      active
                        ? "bg-night text-cream border-night"
                        : "bg-white text-night-muted border-line hover:bg-bg-soft"
                    }`}
                  >
                    {i.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom freeform. */}
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
          Topics personnalisés (CSV)
        </label>
        <input
          type="text"
          value={form.interests}
          onChange={(e) => update({ interests: e.target.value })}
          placeholder="ex: tech.web_dev, lifestyle.cooking"
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
        />
      </div>
    </div>
  );
}

function labelInterest(id: string): string {
  const found = INTEREST_SUGGESTIONS.find((s) => s.id === id);
  if (found) return found.label;
  /* Fallback : transforme tech.web_dev → Web dev. */
  const last = id.split(".").pop() ?? id;
  return last.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/* ============================================================
 * Panel D — Behaviors
 * ============================================================ */

const BEHAVIOR_OPTIONS: Array<{
  type: BehaviorEntry["type"];
  label: string;
  desc: string;
  icon: typeof Activity;
}> = [
  {
    type: "marketplace_buyer",
    label: "Acheteurs Marketplace",
    desc: "Ont acheté ≥ 1 article DIVARC les 90 derniers jours.",
    icon: Briefcase,
  },
  {
    type: "job_seeker",
    label: "Job seekers",
    desc: "Recherche active d'emploi (candidatures, sauvegardes).",
    icon: Briefcase,
  },
  {
    type: "circle_member",
    label: "Membres de cercles",
    desc: "Actifs dans ≥ 1 cercle communautaire.",
    icon: Users2,
  },
  {
    type: "mentor",
    label: "Mentors actifs",
    desc: "Accompagnent ≥ 3 mentees, sessions régulières.",
    icon: Sparkles,
  },
  {
    type: "early_adopter",
    label: "Early adopters",
    desc: "Première vague d'utilisateurs, fortement engagés.",
    icon: Layers3,
  },
];

function BehaviorsPanel({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
}) {
  const toggle = (type: BehaviorEntry["type"]) => {
    const has = form.behaviors.some((b) => b.type === type);
    const next = has
      ? form.behaviors.filter((b) => b.type !== type)
      : [...form.behaviors, { type }];
    update({ behaviors: next });
  };

  return (
    <div className="space-y-2 pt-3">
      <p className="text-[11.5px] text-night-muted leading-snug">
        Comportements détectés par le recsys DIVARC. Logique : OU.
      </p>
      <ul className="space-y-1.5">
        {BEHAVIOR_OPTIONS.map((b) => {
          const active = form.behaviors.some((x) => x.type === b.type);
          const Icon = b.icon;
          return (
            <li key={b.type}>
              <button
                type="button"
                onClick={() => toggle(b.type)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  active
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night border-line hover:bg-bg-soft"
                }`}
              >
                <span
                  aria-hidden
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? "bg-cream/20" : "bg-gold/15"
                  }`}
                >
                  <Icon
                    className={`w-[14px] h-[14px] ${
                      active ? "text-cream" : "text-gold-deep"
                    }`}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">
                    {b.label}
                  </span>
                  <span
                    className={`block text-[11.5px] ${
                      active ? "text-cream/80" : "text-night-muted"
                    }`}
                  >
                    {b.desc}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================
 * Panel E — Connections
 * ============================================================ */

function ConnectionsPanel({
  form,
  update,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
}) {
  const connUpdate = (patch: Partial<AudienceConnections>) =>
    update({ connections: { ...form.connections, ...patch } });

  return (
    <div className="space-y-3 pt-3">
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
          Amis des fans (entity ID)
        </label>
        <input
          type="text"
          value={form.connections.friends_of_engagers ?? ""}
          onChange={(e) =>
            connUpdate({ friends_of_engagers: e.target.value || undefined })
          }
          placeholder="UUID de l'entité (page / cercle)"
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px] font-mono"
        />
        <p className="text-[10.5px] text-night-muted mt-1 leading-snug">
          Cible les amis des utilisateurs qui ont déjà interagi avec cette
          entité (page, cercle, marque).
        </p>
      </div>
      <div>
        <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
          Exclure les fans (entity ID)
        </label>
        <input
          type="text"
          value={form.connections.exclude_fans ?? ""}
          onChange={(e) =>
            connUpdate({ exclude_fans: e.target.value || undefined })
          }
          placeholder="UUID de l'entité"
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px] font-mono"
        />
        <p className="text-[10.5px] text-night-muted mt-1 leading-snug">
          Idéal pour acquisition pure : exclut ceux qui suivent déjà ton
          entité.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Panel F — Custom audiences (saved / pixel / list / engagement)
 * ============================================================ */

function CustomAudiencePanel({
  form,
  update,
  saved,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
  saved: SavedAudience[];
}) {
  const toggleInclude = (id: string) =>
    update({
      custom_audience_ids: form.custom_audience_ids.includes(id)
        ? form.custom_audience_ids.filter((x) => x !== id)
        : [...form.custom_audience_ids, id],
      excluded_custom_audience_ids: form.excluded_custom_audience_ids.filter(
        (x) => x !== id,
      ),
    });

  const toggleExclude = (id: string) =>
    update({
      excluded_custom_audience_ids: form.excluded_custom_audience_ids.includes(
        id,
      )
        ? form.excluded_custom_audience_ids.filter((x) => x !== id)
        : [...form.excluded_custom_audience_ids, id],
      custom_audience_ids: form.custom_audience_ids.filter((x) => x !== id),
    });

  return (
    <div className="space-y-3 pt-3">
      {saved.length === 0 ? (
        <p className="rounded-lg bg-bg-soft border border-line p-3 text-[12px] text-night-muted text-center">
          Aucune audience personnalisée. Crée-en une depuis la section
          Audiences.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {saved.map((a) => {
            const included = form.custom_audience_ids.includes(a.id);
            const excluded = form.excluded_custom_audience_ids.includes(a.id);
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-night truncate">
                    {a.name}
                  </span>
                  <span className="block text-[10.5px] text-night-muted">
                    {labelAudienceType(a.type)}
                    {a.estimated_size != null
                      ? ` · ~${formatCompact(a.estimated_size)}`
                      : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleInclude(a.id)}
                  className={`px-2 py-1 rounded-full text-[10.5px] font-bold border transition-colors ${
                    included
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-white text-night-muted border-line hover:bg-bg-soft"
                  }`}
                >
                  Inclure
                </button>
                <button
                  type="button"
                  onClick={() => toggleExclude(a.id)}
                  className={`px-2 py-1 rounded-full text-[10.5px] font-bold border transition-colors ${
                    excluded
                      ? "bg-red-600 text-white border-red-700"
                      : "bg-white text-night-muted border-line hover:bg-bg-soft"
                  }`}
                >
                  Exclure
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function labelAudienceType(t: string): string {
  return (
    {
      saved: "Audience sauvegardée",
      custom_list: "Liste uploadée",
      custom_pixel: "Visiteurs Pixel",
      custom_engagement: "Engagement",
      lookalike: "Lookalike",
      divarc_special: "Segment DIVARC",
    }[t] ?? t
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ============================================================
 * Panel G — Lookalikes
 * ============================================================ */

function LookalikePanel({
  form,
  update,
  saved,
}: {
  form: CampaignFormState;
  update: (patch: Partial<CampaignFormState>) => void;
  saved: SavedAudience[];
}) {
  const lookalikes = saved.filter((a) => a.type === "lookalike");
  const seedCandidates = saved.filter(
    (a) => a.type === "custom_list" || a.type === "custom_pixel",
  );

  const toggleSelected = (id: string) =>
    update({
      lookalike_audience_ids: form.lookalike_audience_ids.includes(id)
        ? form.lookalike_audience_ids.filter((x) => x !== id)
        : [...form.lookalike_audience_ids, id],
    });

  const setDraft = (patch: Partial<LookalikeDraft>) => {
    const cur: LookalikeDraft = form.lookalike_draft ?? {
      source_audience_id: "",
      countries: ["FR"],
      size_pct: 1,
    };
    update({ lookalike_draft: { ...cur, ...patch } });
  };

  return (
    <div className="space-y-3 pt-3">
      {lookalikes.length > 0 ? (
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Lookalikes existants
          </p>
          <ul className="space-y-1.5">
            {lookalikes.map((a) => {
              const sel = form.lookalike_audience_ids.includes(a.id);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-white"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-night truncate">
                      {a.name}
                    </span>
                    <span className="block text-[10.5px] text-night-muted">
                      {a.estimated_size != null
                        ? `~${formatCompact(a.estimated_size)} users`
                        : "Calcul en cours…"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSelected(a.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                      sel
                        ? "bg-night text-cream border-night"
                        : "bg-white text-night-muted border-line hover:bg-bg-soft"
                    }`}
                  >
                    {sel ? "Sélectionné" : "Choisir"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Brouillon — créer un lookalike à la volée. */}
      <div className="rounded-xl bg-bg-soft border border-line p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles
            className="w-[14px] h-[14px] text-gold-deep shrink-0"
            aria-hidden
          />
          <p className="text-[12px] font-semibold text-night">
            Créer un lookalike à partir d&apos;une seed
          </p>
        </div>

        {seedCandidates.length === 0 ? (
          <p className="text-[11.5px] text-night-muted">
            Tu dois d&apos;abord uploader une liste client ou créer une
            audience Pixel pour servir de seed.
          </p>
        ) : (
          <>
            <select
              value={form.lookalike_draft?.source_audience_id ?? ""}
              onChange={(e) => setDraft({ source_audience_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
            >
              <option value="">Choisir une seed…</option>
              {seedCandidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({labelAudienceType(s.type)})
                </option>
              ))}
            </select>

            {form.lookalike_draft?.source_audience_id ? (
              <>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
                    Pays cibles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRY_OPTIONS.slice(0, 5).map((c) => {
                      const active =
                        form.lookalike_draft?.countries.includes(c.code) ??
                        false;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            const cur =
                              form.lookalike_draft?.countries ?? ["FR"];
                            const next = active
                              ? cur.filter((x) => x !== c.code)
                              : [...cur, c.code];
                            setDraft({
                              countries: next.length === 0 ? ["FR"] : next,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11.5px] border ${
                            active
                              ? "bg-night text-cream border-night"
                              : "bg-white text-night-muted border-line"
                          }`}
                        >
                          {c.flag} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
                    Similarité ({form.lookalike_draft?.size_pct ?? 1} %)
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.lookalike_draft?.size_pct ?? 1}
                    onChange={(e) =>
                      setDraft({ size_pct: Number(e.target.value) })
                    }
                    className="w-full accent-night"
                  />
                  <p className="text-[10.5px] text-night-muted mt-0.5">
                    1% = audience la plus similaire / 10% = plus large.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => update({ lookalike_draft: null })}
                  className="inline-flex items-center gap-1 text-[11.5px] text-night-muted hover:text-red-600"
                >
                  <Trash2 className="w-[12px] h-[12px]" aria-hidden />
                  Annuler le brouillon
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function summarizeLocations(form: CampaignFormState): string {
  const parts: string[] = [];
  if (form.countries.length > 0) parts.push(`${form.countries.length} pays`);
  if (form.cities.length > 0) parts.push(`${form.cities.length} ville(s)`);
  if (form.postal_codes.length > 0)
    parts.push(`${form.postal_codes.length} CP`);
  if (form.custom_locations.length > 0)
    parts.push(`${form.custom_locations.length} radius`);
  return parts.join(" · ") || "Aucune localisation";
}

function labelGender(genders: string[]): string {
  if (genders.length === 0 || genders.includes("all")) return "Tous";
  return genders
    .map(
      (g) =>
        ({
          male: "H",
          female: "F",
          non_binary: "NB",
        })[g] ?? g,
    )
    .join("+");
}

function summarizeConnections(c: AudienceConnections): string {
  const parts: string[] = [];
  if (c.friends_of_engagers) parts.push("Amis des fans");
  if (c.exclude_fans) parts.push("Exclus fans");
  return parts.join(" · ") || "Aucune connection";
}
