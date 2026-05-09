/* Helpers pour générer du JSON-LD Schema.org structuré.
 * Tous renvoient un objet sérialisable directement injectable via
 * <script type="application/ld+json">. */

const BASE = "https://divarc.app";

type ProfileJsonLdInput = {
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
};

export function profileJsonLd(p: ProfileJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${BASE}/u/${p.username}`,
    name: p.fullName ?? p.username,
    alternateName: p.username,
    url: `${BASE}/u/${p.username}`,
    ...(p.avatarUrl ? { image: p.avatarUrl } : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...(p.location
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: p.location,
          },
        }
      : {}),
  };
}

type JobJsonLdInput = {
  id: string;
  title: string;
  description: string;
  postedAt: string;
  validThrough: string | null;
  employmentType: string | null;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  companyName: string | null;
  companyLogo: string | null;
};

/* Schema.org JobPosting — utilisé par Google for Jobs. Les champs requis
 * pour l'éligibilité Google Jobs : title, description, datePosted,
 * hiringOrganization, jobLocation OU applicantLocationRequirements. */
export function jobJsonLd(j: JobJsonLdInput) {
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    freelance: "CONTRACTOR",
  };

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${BASE}/jobs/${j.id}`,
    title: j.title,
    description: j.description,
    datePosted: j.postedAt,
    ...(j.validThrough ? { validThrough: j.validThrough } : {}),
    employmentType: j.employmentType
      ? employmentTypeMap[j.employmentType] ?? "OTHER"
      : "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: j.companyName ?? "DIVARC",
      ...(j.companyLogo ? { logo: j.companyLogo } : {}),
    },
    ...(j.remote
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            name: "FR",
          },
        }
      : j.location
        ? {
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: j.location,
                addressCountry: "FR",
              },
            },
          }
        : {}),
    ...(j.salaryMin || j.salaryMax
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: j.currency,
            value: {
              "@type": "QuantitativeValue",
              ...(j.salaryMin ? { minValue: j.salaryMin } : {}),
              ...(j.salaryMax ? { maxValue: j.salaryMax } : {}),
              unitText: "YEAR",
            },
          },
        }
      : {}),
    directApply: true,
    url: `${BASE}/jobs/${j.id}`,
  };
}

type ListingJsonLdInput = {
  id: string;
  title: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  condition: "new" | "like_new" | "used" | "fair";
  status: "active" | "sold" | "draft" | "archived";
  category: string;
  photoUrl: string | null;
  sellerName: string | null;
  sellerUsername: string | null;
};

/* Schema.org Product (avec offer.itemCondition + availability). Utilisé
 * pour le rich snippet "produit" dans Google Search + AI Overviews. */
export function listingJsonLd(l: ListingJsonLdInput) {
  const conditionMap: Record<string, string> = {
    new: "https://schema.org/NewCondition",
    like_new: "https://schema.org/RefurbishedCondition",
    used: "https://schema.org/UsedCondition",
    fair: "https://schema.org/UsedCondition",
  };

  const availability =
    l.status === "active"
      ? "https://schema.org/InStock"
      : l.status === "sold"
        ? "https://schema.org/SoldOut"
        : "https://schema.org/Discontinued";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE}/marketplace/${l.id}`,
    name: l.title,
    ...(l.description ? { description: l.description } : {}),
    ...(l.photoUrl ? { image: l.photoUrl } : {}),
    category: l.category,
    sku: l.id,
    offers: {
      "@type": "Offer",
      url: `${BASE}/marketplace/${l.id}`,
      price: l.priceAmount,
      priceCurrency: l.priceCurrency,
      itemCondition: conditionMap[l.condition] ?? "https://schema.org/UsedCondition",
      availability,
      ...(l.sellerName
        ? {
            seller: {
              "@type": "Person",
              name: l.sellerName,
              ...(l.sellerUsername
                ? { url: `${BASE}/u/${l.sellerUsername}` }
                : {}),
            },
          }
        : {}),
    },
  };
}

/* Composant utilitaire pour injecter du JSON-LD via <script>. Use-case :
 *   <JsonLd data={profileJsonLd(...)} />
 * Volontairement minimal — pas de `id` ni `key`, on s'appuie sur le DOM
 * standard. */
export function jsonLdScriptProps(data: object) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data),
    },
  } as const;
}
