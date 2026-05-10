import "server-only";
import type { CrawledPage } from "./crawler";
import {
  extractAllOpenGraph,
  extractAnchors,
  extractHeadings,
  extractImages,
  extractJsonLd,
  extractMetaContent,
  extractTitle,
} from "./htmlParse";

/* Extracteur de données structurées depuis les pages crawlées.
 *
 * Sources prioritaires :
 *   1. JSON-LD Schema.org (Organization, Product, Service, LocalBusiness)
 *      → la donnée la plus propre, structurée par l'annonceur
 *   2. Open Graph (og:title, og:description, og:image, og:type, og:site_name)
 *   3. Meta description + title
 *   4. H1, H2, H3 hiérarchie
 *   5. Images > 600x600 avec alt text
 *
 * Output : ExtractedData utilisable par le LLM classifier sans
 * envoyer le HTML complet (économie tokens + précision).
 */

export type ExtractedData = {
  /* Site-level (consolidé sur toutes les pages). */
  site_name: string | null;
  site_description: string | null;
  /* Schema.org Organization si trouvé. */
  organization: {
    name?: string;
    description?: string;
    url?: string;
    logo?: string;
    sameAs?: string[]; // social profiles
    address?: Record<string, string>;
  } | null;
  /* Per-page metadata. */
  pages: ExtractedPage[];
  /* Aggregé (toutes pages). */
  all_text_excerpt: string; // 10K chars premiers
  all_h1s: string[];
  all_h2s: string[];
  all_h3s: string[];
  /* Produits / services détectés. */
  products: ExtractedProduct[];
  services: ExtractedService[];
  /* Images. */
  images: ExtractedImage[];
  /* Réseaux sociaux détectés. */
  social_links: SocialLink[];
};

export type ExtractedPage = {
  url: string;
  title: string | null;
  meta_description: string | null;
  og: Record<string, string>;
  schemas: Array<Record<string, unknown>>;
  h1: string[];
  h2: string[];
  h3: string[];
};

export type ExtractedProduct = {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  url?: string;
};

export type ExtractedService = {
  name: string;
  description?: string;
};

export type ExtractedImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  is_logo: boolean;
};

export type SocialLink = {
  platform: string;
  url: string;
};

const SOCIAL_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "facebook", pattern: /facebook\.com|fb\.com/i },
  { platform: "instagram", pattern: /instagram\.com/i },
  { platform: "twitter", pattern: /twitter\.com|x\.com/i },
  { platform: "linkedin", pattern: /linkedin\.com/i },
  { platform: "youtube", pattern: /youtube\.com|youtu\.be/i },
  { platform: "tiktok", pattern: /tiktok\.com/i },
  { platform: "pinterest", pattern: /pinterest\./i },
];

export function extractStructuredData(pages: CrawledPage[]): ExtractedData {
  const extractedPages: ExtractedPage[] = [];
  const allH1s: string[] = [];
  const allH2s: string[] = [];
  const allH3s: string[] = [];
  const allText: string[] = [];
  const allProducts: ExtractedProduct[] = [];
  const allServices: ExtractedService[] = [];
  const allImages: ExtractedImage[] = [];
  const socialMap = new Map<string, string>();

  let organization: ExtractedData["organization"] = null;
  let siteName: string | null = null;
  let siteDescription: string | null = null;

  for (const page of pages) {
    try {
      const html = page.html;

      /* Title + meta description (regex, pas de JSDOM). */
      const title = extractTitle(html);
      const metaDesc = extractMetaContent(html, "name", "description");

      /* Open Graph. */
      const og = extractAllOpenGraph(html);
      if (og["og:site_name"] && !siteName) siteName = og["og:site_name"];
      if (og["og:description"] && !siteDescription) {
        siteDescription = og["og:description"];
      }

      /* Schema.org JSON-LD. */
      const schemas = extractJsonLd(html);

      /* Détection Organization, Product, Service depuis schemas. */
      for (const schema of schemas) {
        const type = schema["@type"];
        if (typeof type === "string") {
          if (
            (type === "Organization" || type === "LocalBusiness" || type === "Corporation") &&
            !organization
          ) {
            organization = {
              name: typeof schema.name === "string" ? schema.name : undefined,
              description:
                typeof schema.description === "string" ? schema.description : undefined,
              url: typeof schema.url === "string" ? schema.url : undefined,
              logo: extractLogo(schema),
              sameAs: extractSameAs(schema),
              address: extractAddress(schema),
            };
          }
          if (type === "Product") {
            allProducts.push(extractProduct(schema, page.url));
          }
          if (type === "Service") {
            allServices.push({
              name: typeof schema.name === "string" ? schema.name : "Service",
              description:
                typeof schema.description === "string"
                  ? schema.description
                  : undefined,
            });
          }
        }
      }

      /* H1/H2/H3. */
      const pageH1s = extractHeadings(html, 1);
      const pageH2s = extractHeadings(html, 2);
      const pageH3s = extractHeadings(html, 3);
      allH1s.push(...pageH1s);
      allH2s.push(...pageH2s);
      allH3s.push(...pageH3s);

      /* Images > 200x200 (filtrage si dimensions connues). */
      for (const img of extractImages(html)) {
        try {
          const absUrl = new URL(img.src, page.url).toString();
          const width = img.width;
          const height = img.height;
          if (width && height && (width < 200 || height < 200)) continue;
          const isLogo =
            (img.alt && /\blogo\b/i.test(img.alt)) ||
            /\blogo\b/i.test(absUrl) ||
            (width !== undefined &&
              width < 300 &&
              height !== undefined &&
              height < 300);
          allImages.push({
            url: absUrl,
            alt: img.alt,
            width,
            height,
            is_logo: !!isLogo,
          });
        } catch {
          /* Invalid URL, skip. */
        }
      }

      /* Liens sociaux. */
      for (const href of extractAnchors(html)) {
        for (const { platform, pattern } of SOCIAL_PATTERNS) {
          if (pattern.test(href) && !socialMap.has(platform)) {
            socialMap.set(platform, href);
          }
        }
      }

      /* Texte de la page (déjà nettoyé par le crawler). */
      if (page.text_content) allText.push(page.text_content);

      extractedPages.push({
        url: page.url,
        title,
        meta_description: metaDesc,
        og,
        schemas,
        h1: pageH1s,
        h2: pageH2s,
        h3: pageH3s,
      });
    } catch {
      /* Parser error sur cette page, continue. */
    }
  }

  /* Fallback site_name / description. */
  if (!siteName) {
    siteName = organization?.name ?? extractedPages[0]?.title ?? null;
  }
  if (!siteDescription) {
    siteDescription =
      organization?.description ??
      extractedPages[0]?.meta_description ??
      null;
  }

  /* Dédoublonnage produits par name. */
  const uniqueProducts = dedupeBy(allProducts, (p) => p.name.toLowerCase());
  const uniqueServices = dedupeBy(allServices, (s) => s.name.toLowerCase());
  const uniqueImages = dedupeBy(allImages, (i) => i.url);

  /* Texte combiné, max 30k chars pour LLM (économie tokens). */
  let combinedText = allText.join("\n\n").slice(0, 30_000);

  return {
    site_name: siteName,
    site_description: siteDescription,
    organization,
    pages: extractedPages,
    all_text_excerpt: combinedText,
    all_h1s: dedupe(allH1s),
    all_h2s: dedupe(allH2s).slice(0, 50),
    all_h3s: dedupe(allH3s).slice(0, 100),
    products: uniqueProducts.slice(0, 20),
    services: uniqueServices.slice(0, 10),
    images: uniqueImages.slice(0, 30),
    social_links: Array.from(socialMap.entries()).map(([platform, url]) => ({
      platform,
      url,
    })),
  };
}

function extractProduct(
  schema: Record<string, unknown>,
  pageUrl: string,
): ExtractedProduct {
  const name = typeof schema.name === "string" ? schema.name : "Produit";
  const description =
    typeof schema.description === "string" ? schema.description : undefined;
  let price: number | undefined;
  let currency: string | undefined;
  const offers = schema.offers as
    | { price?: number | string; priceCurrency?: string }
    | Array<{ price?: number | string; priceCurrency?: string }>
    | undefined;
  if (offers) {
    const first = Array.isArray(offers) ? offers[0] : offers;
    if (first?.price !== undefined) {
      price = typeof first.price === "string" ? parseFloat(first.price) : first.price;
    }
    if (first?.priceCurrency) currency = first.priceCurrency;
  }
  let imageUrl: string | undefined;
  const img = schema.image;
  if (typeof img === "string") imageUrl = img;
  else if (Array.isArray(img) && typeof img[0] === "string") imageUrl = img[0];
  else if (
    img &&
    typeof img === "object" &&
    "url" in img &&
    typeof (img as { url: unknown }).url === "string"
  ) {
    imageUrl = (img as { url: string }).url;
  }

  let url: string | undefined =
    typeof schema.url === "string" ? schema.url : undefined;
  if (url) {
    try {
      url = new URL(url, pageUrl).toString();
    } catch {
      url = undefined;
    }
  }

  return { name, description, price, currency, image_url: imageUrl, url };
}

function extractLogo(schema: Record<string, unknown>): string | undefined {
  const logo = schema.logo;
  if (typeof logo === "string") return logo;
  if (
    logo &&
    typeof logo === "object" &&
    "url" in logo &&
    typeof (logo as { url: unknown }).url === "string"
  ) {
    return (logo as { url: string }).url;
  }
  return undefined;
}

function extractSameAs(schema: Record<string, unknown>): string[] | undefined {
  const sameAs = schema.sameAs;
  if (Array.isArray(sameAs)) {
    return sameAs.filter((s): s is string => typeof s === "string");
  }
  if (typeof sameAs === "string") return [sameAs];
  return undefined;
}

function extractAddress(
  schema: Record<string, unknown>,
): Record<string, string> | undefined {
  const addr = schema.address;
  if (addr && typeof addr === "object" && !Array.isArray(addr)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(addr as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return undefined;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function dedupeBy<T>(arr: T[], key: (v: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

function parseIntOrUndefined(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
