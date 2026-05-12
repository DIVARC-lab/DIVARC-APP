/* Marketplace DIVARC — Schémas d'attributs dynamiques par catégorie
 * (Chantier 1.3).
 *
 * Chaque catégorie de produit a des attributs spécifiques (marque, taille,
 * kilométrage, etc.). Ce module définit :
 *   - Les types de champs supportés (select, number, boolean, ...)
 *   - Les schémas pour 4 catégories prioritaires (V1)
 *   - Un helper validateAttributes() basé sur Zod
 *
 * Le wizard de création d'annonce génère dynamiquement le formulaire
 * selon le schema de la sous-catégorie sélectionnée. */

import { z } from "zod";

/* ===========================================================================
 * TYPES DE CHAMPS
 * =========================================================================== */

type FieldBase = {
  /* Identifiant interne (clé dans Listing.attributes). */
  key: string;
  /* Libellé FR affiché en label de l'input. */
  label: string;
  /* Indication courte sous l'input (optionnel). */
  hint?: string;
  /* Si true : valeur stockée mais cachée du grand public (ex: IMEI). */
  private?: boolean;
};

export type SelectField = FieldBase & {
  type: "select";
  options: ReadonlyArray<{ value: string; label: string }>;
  /* Si défini : les options dépendent de la valeur d'un autre champ
     (ex: model dépend de brand). UI gère le lookup. */
  depends_on?: string;
};

export type MultiSelectField = FieldBase & {
  type: "multi_select";
  options: ReadonlyArray<{ value: string; label: string }>;
  max?: number;
};

export type AutocompleteField = FieldBase & {
  type: "autocomplete";
  /* Liste initiale pour suggestions ; l'user peut entrer du custom. */
  suggestions: ReadonlyArray<string>;
  allow_custom?: boolean;
};

export type NumberField = FieldBase & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  /* Suffix d'unité affiché à droite de l'input (ex: "km", "€", "m²"). */
  unit?: string;
  integer?: boolean;
};

export type BooleanField = FieldBase & {
  type: "boolean";
};

export type DateField = FieldBase & {
  type: "date";
  min_year?: number;
  max_year?: number;
};

export type RichTextField = FieldBase & {
  type: "rich_text";
  max_length?: number;
};

export type TextField = FieldBase & {
  type: "text";
  max_length?: number;
  pattern?: string; // regex
};

export type Field =
  | SelectField
  | MultiSelectField
  | AutocompleteField
  | NumberField
  | BooleanField
  | DateField
  | RichTextField
  | TextField;

export type CategoryAttributeSchema = {
  /* Identifiant de la catégorie (ex: "fashion.women.dresses"). */
  category_id: string;
  /* Champs requis pour publier l'annonce. */
  required: ReadonlyArray<Field>;
  /* Champs optionnels (affichés repliés dans un section "Plus de détails"). */
  optional: ReadonlyArray<Field>;
};

/* ===========================================================================
 * LISTES PARTAGÉES (réutilisées entre schémas)
 * =========================================================================== */

const COLORS = [
  { value: "noir", label: "Noir" },
  { value: "blanc", label: "Blanc" },
  { value: "gris", label: "Gris" },
  { value: "beige", label: "Beige" },
  { value: "marron", label: "Marron" },
  { value: "rouge", label: "Rouge" },
  { value: "rose", label: "Rose" },
  { value: "orange", label: "Orange" },
  { value: "jaune", label: "Jaune" },
  { value: "vert", label: "Vert" },
  { value: "bleu", label: "Bleu" },
  { value: "violet", label: "Violet" },
  { value: "or", label: "Or" },
  { value: "argent", label: "Argent" },
  { value: "multicolore", label: "Multicolore" },
] as const;

const ALL_CONDITIONS = [
  { value: "new_with_tags", label: "Neuf avec étiquettes" },
  { value: "new_without_tags", label: "Neuf sans étiquettes" },
  { value: "very_good", label: "Très bon état" },
  { value: "good", label: "Bon état" },
  { value: "satisfactory", label: "État satisfaisant" },
  { value: "damaged", label: "Abîmé / pour pièces" },
] as const;

const FASHION_BRANDS = [
  "Zara",
  "H&M",
  "Mango",
  "Massimo Dutti",
  "Bershka",
  "Pull&Bear",
  "Stradivarius",
  "Uniqlo",
  "COS",
  "Sandro",
  "Maje",
  "The Kooples",
  "Comptoir des Cotonniers",
  "Sézane",
  "Rouje",
  "Ba&sh",
  "IRO",
  "Isabel Marant",
  "Acne Studios",
  "AMI",
  "Off-White",
  "Balenciaga",
  "Gucci",
  "Prada",
  "Chanel",
  "Dior",
  "Louis Vuitton",
  "Hermès",
  "Saint Laurent",
  "Givenchy",
  "Nike",
  "Adidas",
  "Puma",
  "New Balance",
  "Vans",
  "Converse",
  "Levi's",
  "Diesel",
  "Tommy Hilfiger",
  "Ralph Lauren",
  "Lacoste",
  "Polo",
  "Calvin Klein",
  "Hugo Boss",
  "Armani",
  "Versace",
  "Dolce & Gabbana",
  "Burberry",
  "Stone Island",
  "Carhartt",
  "The North Face",
  "Patagonia",
  "Marine Serre",
  "Jacquemus",
  "Ganni",
  "Other",
] as const;

const FASHION_SIZES = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "32", label: "32" },
  { value: "34", label: "34" },
  { value: "36", label: "36" },
  { value: "38", label: "38" },
  { value: "40", label: "40" },
  { value: "42", label: "42" },
  { value: "44", label: "44" },
  { value: "46", label: "46" },
  { value: "48", label: "48" },
] as const;

const CAR_BRANDS = [
  "Peugeot",
  "Renault",
  "Citroën",
  "DS",
  "Dacia",
  "Volkswagen",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Opel",
  "Ford",
  "Fiat",
  "Toyota",
  "Honda",
  "Nissan",
  "Hyundai",
  "Kia",
  "Mazda",
  "Volvo",
  "Skoda",
  "SEAT",
  "Mini",
  "Tesla",
  "Porsche",
  "Land Rover",
  "Jaguar",
  "Lexus",
  "Mitsubishi",
  "Subaru",
  "Suzuki",
  "Alfa Romeo",
  "Jeep",
  "Smart",
  "Dodge",
  "Chevrolet",
  "Lancia",
  "Saab",
  "Other",
] as const;

const SMARTPHONE_BRANDS = [
  { value: "Apple", label: "Apple" },
  { value: "Samsung", label: "Samsung" },
  { value: "Xiaomi", label: "Xiaomi" },
  { value: "Google", label: "Google" },
  { value: "OnePlus", label: "OnePlus" },
  { value: "Huawei", label: "Huawei" },
  { value: "Honor", label: "Honor" },
  { value: "Oppo", label: "Oppo" },
  { value: "Realme", label: "Realme" },
  { value: "Sony", label: "Sony" },
  { value: "Nothing", label: "Nothing" },
  { value: "Other", label: "Autre" },
] as const;

const DPE_CLASSES = [
  { value: "A", label: "A (≤ 50)" },
  { value: "B", label: "B (51-90)" },
  { value: "C", label: "C (91-150)" },
  { value: "D", label: "D (151-230)" },
  { value: "E", label: "E (231-330)" },
  { value: "F", label: "F (331-450)" },
  { value: "G", label: "G (> 450)" },
] as const;

const FUEL_TYPES = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "electrique", label: "Électrique" },
  { value: "hybride", label: "Hybride" },
  { value: "hybride_rechargeable", label: "Hybride rechargeable" },
  { value: "gpl", label: "GPL" },
  { value: "ethanol", label: "Éthanol (E85)" },
] as const;

const TRANSMISSIONS = [
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" },
] as const;

const CAR_BODY_TYPES = [
  { value: "berline", label: "Berline" },
  { value: "suv", label: "SUV / 4x4" },
  { value: "break", label: "Break" },
  { value: "citadine", label: "Citadine" },
  { value: "coupe", label: "Coupé" },
  { value: "cabriolet", label: "Cabriolet" },
  { value: "monospace", label: "Monospace" },
  { value: "pickup", label: "Pick-up" },
  { value: "utilitaire", label: "Utilitaire" },
] as const;

const CRITAIR = [
  { value: "0", label: "Crit'Air 0 (électrique)" },
  { value: "1", label: "Crit'Air 1" },
  { value: "2", label: "Crit'Air 2" },
  { value: "3", label: "Crit'Air 3" },
  { value: "4", label: "Crit'Air 4" },
  { value: "5", label: "Crit'Air 5" },
] as const;

/* ===========================================================================
 * SCHÉMAS — 4 catégories prioritaires V1
 * =========================================================================== */

export const SCHEMAS: Record<string, CategoryAttributeSchema> = {
  /* ----- 1. Mode femme : robes ---------------------------------------- */
  "fashion.women.dresses": {
    category_id: "fashion.women.dresses",
    required: [
      {
        type: "autocomplete",
        key: "brand",
        label: "Marque",
        hint: "Ex : Zara, Maje, Sézane…",
        suggestions: FASHION_BRANDS,
        allow_custom: true,
      },
      {
        type: "select",
        key: "size",
        label: "Taille",
        options: FASHION_SIZES,
      },
      {
        type: "multi_select",
        key: "color",
        label: "Couleur(s) principale(s)",
        options: COLORS,
        max: 3,
      },
      {
        type: "select",
        key: "condition_v2",
        label: "État",
        options: ALL_CONDITIONS,
      },
    ],
    optional: [
      {
        type: "multi_select",
        key: "material",
        label: "Matière",
        options: [
          { value: "coton", label: "Coton" },
          { value: "lin", label: "Lin" },
          { value: "polyester", label: "Polyester" },
          { value: "viscose", label: "Viscose" },
          { value: "soie", label: "Soie" },
          { value: "laine", label: "Laine" },
          { value: "cuir", label: "Cuir" },
          { value: "denim", label: "Denim" },
          { value: "synthetique", label: "Synthétique" },
        ],
      },
      {
        type: "select",
        key: "style",
        label: "Style",
        options: [
          { value: "casual", label: "Casual" },
          { value: "elegant", label: "Élégant" },
          { value: "soiree", label: "Soirée" },
          { value: "ete", label: "Été" },
          { value: "hiver", label: "Hiver" },
          { value: "vintage", label: "Vintage" },
          { value: "bohème", label: "Bohème" },
          { value: "streetwear", label: "Streetwear" },
        ],
      },
      {
        type: "select",
        key: "length",
        label: "Longueur",
        options: [
          { value: "mini", label: "Mini" },
          { value: "midi", label: "Midi" },
          { value: "maxi", label: "Maxi" },
        ],
      },
      {
        type: "select",
        key: "sleeve_length",
        label: "Longueur des manches",
        options: [
          { value: "sans_manches", label: "Sans manches" },
          { value: "courtes", label: "Courtes" },
          { value: "trois_quarts", label: "3/4" },
          { value: "longues", label: "Longues" },
        ],
      },
      {
        type: "select",
        key: "pattern",
        label: "Motif",
        options: [
          { value: "uni", label: "Uni" },
          { value: "rayures", label: "Rayures" },
          { value: "fleurs", label: "Fleurs" },
          { value: "carreaux", label: "Carreaux" },
          { value: "pois", label: "Pois" },
          { value: "imprime", label: "Imprimé" },
          { value: "animal", label: "Animal" },
        ],
      },
    ],
  },

  /* ----- 2. Véhicules : voitures -------------------------------------- */
  "vehicles.cars": {
    category_id: "vehicles.cars",
    required: [
      {
        type: "autocomplete",
        key: "brand",
        label: "Marque",
        suggestions: CAR_BRANDS,
        allow_custom: true,
      },
      {
        type: "text",
        key: "model",
        label: "Modèle",
        hint: "Ex : 308, A3, Clio…",
        max_length: 80,
      },
      {
        type: "number",
        key: "year",
        label: "Année",
        min: 1900,
        max: new Date().getFullYear() + 1,
        integer: true,
      },
      {
        type: "number",
        key: "mileage_km",
        label: "Kilométrage",
        min: 0,
        max: 1_000_000,
        unit: "km",
        integer: true,
      },
      {
        type: "select",
        key: "fuel_type",
        label: "Carburant",
        options: FUEL_TYPES,
      },
      {
        type: "select",
        key: "transmission",
        label: "Boîte de vitesses",
        options: TRANSMISSIONS,
      },
      {
        type: "select",
        key: "body_type",
        label: "Carrosserie",
        options: CAR_BODY_TYPES,
      },
    ],
    optional: [
      {
        type: "number",
        key: "power_kw",
        label: "Puissance (kW)",
        min: 0,
        max: 2000,
        unit: "kW",
      },
      {
        type: "number",
        key: "power_cv",
        label: "Puissance fiscale",
        min: 0,
        max: 200,
        unit: "CV",
        integer: true,
      },
      {
        type: "select",
        key: "doors",
        label: "Nombre de portes",
        options: [
          { value: "3", label: "3 portes" },
          { value: "5", label: "5 portes" },
        ],
      },
      {
        type: "number",
        key: "seats",
        label: "Places",
        min: 2,
        max: 9,
        integer: true,
      },
      {
        type: "select",
        key: "color_exterior",
        label: "Couleur extérieure",
        options: COLORS,
      },
      {
        type: "select",
        key: "color_interior",
        label: "Couleur intérieure",
        options: COLORS,
      },
      {
        type: "date",
        key: "first_registration",
        label: "Première mise en circulation",
        min_year: 1900,
      },
      {
        type: "boolean",
        key: "technical_inspection_valid",
        label: "Contrôle technique valide",
      },
      {
        type: "select",
        key: "critair_sticker",
        label: "Vignette Crit'Air",
        options: CRITAIR,
      },
      {
        type: "rich_text",
        key: "history",
        label: "Historique d'entretien",
        max_length: 2000,
      },
      {
        type: "multi_select",
        key: "features",
        label: "Équipements",
        options: [
          { value: "gps", label: "GPS" },
          { value: "clim", label: "Climatisation" },
          { value: "toit_ouvrant", label: "Toit ouvrant" },
          { value: "regulateur", label: "Régulateur de vitesse" },
          { value: "camera_recul", label: "Caméra de recul" },
          { value: "carplay", label: "Apple CarPlay / Android Auto" },
          { value: "bluetooth", label: "Bluetooth" },
          { value: "sieges_chauffants", label: "Sièges chauffants" },
          { value: "cuir", label: "Sellerie cuir" },
          { value: "jantes_alu", label: "Jantes alu" },
          { value: "attelage", label: "Attelage" },
          { value: "park_assist", label: "Aide au stationnement" },
        ],
      },
    ],
  },

  /* ----- 3. Immobilier : vente appartement ---------------------------- */
  "real_estate.apartment_sale": {
    category_id: "real_estate.apartment_sale",
    required: [
      {
        type: "number",
        key: "surface_m2",
        label: "Surface habitable",
        min: 1,
        max: 10000,
        unit: "m²",
      },
      {
        type: "number",
        key: "rooms",
        label: "Nombre de pièces",
        min: 1,
        max: 30,
        integer: true,
      },
      {
        type: "number",
        key: "bedrooms",
        label: "Nombre de chambres",
        min: 0,
        max: 20,
        integer: true,
      },
      {
        type: "number",
        key: "floor",
        label: "Étage",
        min: -2,
        max: 100,
        integer: true,
      },
      {
        type: "select",
        key: "dpe_class",
        label: "DPE (consommation énergétique)",
        options: DPE_CLASSES,
      },
      {
        type: "select",
        key: "ges_class",
        label: "GES (gaz à effet de serre)",
        options: DPE_CLASSES,
      },
    ],
    optional: [
      {
        type: "number",
        key: "bathrooms",
        label: "Nombre de salles de bain",
        min: 0,
        max: 10,
        integer: true,
      },
      {
        type: "boolean",
        key: "has_elevator",
        label: "Ascenseur",
      },
      {
        type: "boolean",
        key: "has_balcony",
        label: "Balcon ou terrasse",
      },
      {
        type: "boolean",
        key: "has_parking",
        label: "Place de parking",
      },
      {
        type: "boolean",
        key: "has_cellar",
        label: "Cave",
      },
      {
        type: "number",
        key: "construction_year",
        label: "Année de construction",
        min: 1700,
        max: new Date().getFullYear(),
        integer: true,
      },
      {
        type: "select",
        key: "heating_type",
        label: "Type de chauffage",
        options: [
          { value: "individuel_gaz", label: "Individuel gaz" },
          { value: "individuel_electrique", label: "Individuel électrique" },
          { value: "individuel_pompe_chaleur", label: "Pompe à chaleur" },
          { value: "collectif_gaz", label: "Collectif gaz" },
          { value: "collectif_fioul", label: "Collectif fioul" },
          { value: "geothermique", label: "Géothermique" },
        ],
      },
      {
        type: "number",
        key: "syndic_fees_monthly",
        label: "Charges de copropriété",
        min: 0,
        max: 5000,
        unit: "€/mois",
      },
      {
        type: "number",
        key: "co_owners_count",
        label: "Nombre de lots dans la copropriété",
        min: 1,
        max: 5000,
        integer: true,
      },
      {
        type: "number",
        key: "tax_fonciere",
        label: "Taxe foncière annuelle",
        min: 0,
        max: 100000,
        unit: "€/an",
      },
    ],
  },

  /* ----- 4. Tech : smartphones --------------------------------------- */
  "tech.smartphones": {
    category_id: "tech.smartphones",
    required: [
      {
        type: "select",
        key: "brand",
        label: "Marque",
        options: SMARTPHONE_BRANDS,
      },
      {
        type: "text",
        key: "model",
        label: "Modèle",
        hint: "Ex : iPhone 14 Pro, Galaxy S23…",
        max_length: 80,
      },
      {
        type: "select",
        key: "storage_gb",
        label: "Capacité de stockage",
        options: [
          { value: "16", label: "16 Go" },
          { value: "32", label: "32 Go" },
          { value: "64", label: "64 Go" },
          { value: "128", label: "128 Go" },
          { value: "256", label: "256 Go" },
          { value: "512", label: "512 Go" },
          { value: "1024", label: "1 To" },
        ],
      },
      {
        type: "select",
        key: "color",
        label: "Couleur",
        options: COLORS,
      },
      {
        type: "select",
        key: "condition_v2",
        label: "État",
        options: ALL_CONDITIONS,
      },
    ],
    optional: [
      {
        type: "boolean",
        key: "has_box",
        label: "Boîte d'origine",
      },
      {
        type: "boolean",
        key: "has_accessories",
        label: "Accessoires d'origine (chargeur, etc.)",
      },
      {
        type: "boolean",
        key: "is_unlocked",
        label: "Désimlocké tout opérateur",
      },
      {
        type: "number",
        key: "battery_health_percent",
        label: "Santé de la batterie",
        min: 0,
        max: 100,
        unit: "%",
        integer: true,
      },
      {
        type: "text",
        key: "imei",
        label: "IMEI (vérification anti-vol)",
        hint: "Privé — sert uniquement à vérifier auprès du vendeur",
        max_length: 32,
        private: true,
      },
      {
        type: "number",
        key: "warranty_remaining_months",
        label: "Garantie restante",
        min: 0,
        max: 60,
        unit: "mois",
        integer: true,
      },
    ],
  },
};

/* ===========================================================================
 * HELPERS
 * =========================================================================== */

export function getAttributeSchema(
  categoryId: string,
): CategoryAttributeSchema | null {
  return SCHEMAS[categoryId] ?? null;
}

/* Liste tous les category_ids pour lesquels un schéma existe (utile pour
 * tests / debug). */
export function listSchemaCategories(): string[] {
  return Object.keys(SCHEMAS);
}

/* Construit un schéma Zod depuis le schéma d'attributs d'une catégorie.
 * Utilisé pour valider listing.attributes au moment de l'insert. */
export function buildZodSchema(schema: CategoryAttributeSchema): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of schema.required) {
    shape[field.key] = fieldToZod(field);
  }
  for (const field of schema.optional) {
    shape[field.key] = fieldToZod(field).optional();
  }
  return z.object(shape).passthrough();
}

function fieldToZod(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case "select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      return z.enum(values);
    }
    case "multi_select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      let arr = z.array(z.enum(values));
      if (field.max !== undefined) arr = arr.max(field.max);
      return arr;
    }
    case "autocomplete": {
      return z.string().trim().min(1).max(120);
    }
    case "text": {
      let s = z.string().trim();
      if (field.max_length) s = s.max(field.max_length);
      if (field.pattern) s = s.regex(new RegExp(field.pattern));
      return s;
    }
    case "rich_text": {
      let s = z.string().trim();
      if (field.max_length) s = s.max(field.max_length);
      return s;
    }
    case "number": {
      let n = field.integer ? z.number().int() : z.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      return n;
    }
    case "boolean":
      return z.boolean();
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD attendu");
  }
}

/* Valide un objet d'attributs contre le schéma d'une catégorie.
 * Retourne :
 *   - { ok: true, data } si valide
 *   - { ok: false, errors } sinon (issues Zod typées) */
export type ValidateResult =
  | { ok: true; data: Record<string, unknown> }
  | {
      ok: false;
      errors: Array<{ path: string; message: string }>;
    };

export function validateAttributes(
  categoryId: string,
  attrs: unknown,
): ValidateResult {
  const schema = getAttributeSchema(categoryId);
  if (!schema) {
    /* Pas de schéma défini pour cette catégorie → on accepte tout (V1).
       Sera plus strict une fois toutes les sous-cats schémifiées. */
    if (typeof attrs === "object" && attrs !== null && !Array.isArray(attrs)) {
      return { ok: true, data: attrs as Record<string, unknown> };
    }
    return {
      ok: false,
      errors: [{ path: "", message: "attributes doit être un objet" }],
    };
  }

  const zod = buildZodSchema(schema);
  const result = zod.safeParse(attrs);
  if (result.success) {
    return { ok: true, data: result.data as Record<string, unknown> };
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
