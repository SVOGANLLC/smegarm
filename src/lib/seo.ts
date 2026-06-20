import type { Lang } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n";

/** Public site origin — from env on server, window on client. */
export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.PUBLIC_BASE_URL || "https://smeg.am").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${p}`;
}

const FAVICON_VERSION = "3";

export function faviconLinks() {
  const o = siteOrigin();
  const v = `?v=${FAVICON_VERSION}`;
  return [
    { rel: "icon" as const, type: "image/png", sizes: "192x192", href: `${o}/icon-192.png${v}` },
    { rel: "icon" as const, type: "image/png", sizes: "32x32", href: `${o}/favicon-32.png${v}` },
    { rel: "icon" as const, type: "image/png", sizes: "16x16", href: `${o}/favicon-16.png${v}` },
    { rel: "icon" as const, href: `${o}/favicon.ico${v}`, sizes: "any" },
    { rel: "shortcut icon" as const, href: `${o}/favicon.ico${v}` },
    { rel: "apple-touch-icon" as const, href: `${o}/apple-touch-icon.png${v}` },
  ];
}

export function productPath(sku: string): string {
  return `/product/${encodeURIComponent(sku)}`;
}

export function productCanonical(sku: string): string {
  return absoluteUrl(productPath(sku));
}

type ProductSeoRow = {
  sku: string;
  name?: string | null;
  name_en?: string | null;
  name_hy?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_hy?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  main_image?: string | null;
  og_image?: string | null;
  price_amd?: number | null;
  availability?: string | null;
  brand?: string | null;
  category?: string | null;
  category_en?: string | null;
};

export function productTitle(p: ProductSeoRow, lang: Lang = "hy"): string {
  const custom = p.seo_title?.trim();
  if (custom) return custom;
  const name =
    pickLocalized(p as Record<string, unknown>, "name", lang) ||
    p.name_en ||
    p.name ||
    p.sku;
  return `${name} (${p.sku}) — Smeg Armenia`;
}

export function productDescription(p: ProductSeoRow, lang: Lang = "hy"): string {
  const custom = p.seo_description?.trim();
  if (custom) return custom.slice(0, 320);
  const desc =
    pickLocalized(p as Record<string, unknown>, "description", lang) ||
    p.description_en ||
    p.description ||
    productTitle(p, lang);
  return desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 320);
}

export function productOgImage(p: ProductSeoRow): string {
  const img = p.og_image || p.main_image;
  if (!img) return absoluteUrl("/og-image.png");
  if (img.startsWith("http")) return img;
  return absoluteUrl(img);
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Smeg Armenia",
    alternateName: "SMEG ARM",
    url: siteOrigin(),
    logo: absoluteUrl("/icon-512.png"),
    email: "smeg@smeg.am",
    telephone: "+37460680088",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nar-Dos 2",
      addressLocality: "Yerevan",
      addressCountry: "AM",
    },
    sameAs: [
      "https://instagram.com/smegarmenia/",
      "https://facebook.com/SmegArmeniaOfficial",
      "https://www.youtube.com/@smegarmeniaofficial",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Smeg Armenia",
    url: siteOrigin(),
    inLanguage: ["hy", "ru", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteOrigin()}/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Smeg Armenia Showroom",
    image: absoluteUrl("/og-image.png"),
    url: siteOrigin(),
    telephone: "+37460680088",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nar-Dos 2",
      addressLocality: "Yerevan",
      postalCode: "0010",
      addressCountry: "AM",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.164568,
      longitude: 44.508932,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "19:00",
    },
    parentOrganization: { "@type": "Organization", name: "Smeg Armenia" },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(p: ProductSeoRow, lang: Lang = "hy") {
  const inStock = p.availability === "in_stock" || p.availability === "available";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pickLocalized(p as Record<string, unknown>, "name", lang) || p.name || p.sku,
    description: productDescription(p, lang),
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand || "Smeg" },
    image: productOgImage(p),
    url: productCanonical(p.sku),
    offers: p.price_amd
      ? {
          "@type": "Offer",
          priceCurrency: "AMD",
          price: p.price_amd,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
          url: productCanonical(p.sku),
          seller: { "@type": "Organization", name: "Smeg Armenia" },
        }
      : undefined,
  };
}

/** TanStack Router head meta helpers */
export function seoMeta(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  locale?: string;
  keywords?: string;
}) {
  const url = opts.path ? absoluteUrl(opts.path) : siteOrigin();
  const image = opts.image || absoluteUrl("/og-image.png");
  const robots = opts.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { name: "robots", content: robots },
    { name: "googlebot", content: robots },
    ...(opts.keywords ? [{ name: "keywords", content: opts.keywords }] : []),
    { name: "geo.region", content: "AM-ER" },
    { name: "geo.placename", content: "Yerevan" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type || "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:site_name", content: "Smeg Armenia" },
    { property: "og:locale", content: opts.locale || "hy_AM" },
    { property: "og:locale:alternate", content: "ru_RU" },
    { property: "og:locale:alternate", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
  ];
}

export function canonicalLink(path: string) {
  return [{ rel: "canonical" as const, href: absoluteUrl(path) }];
}

export function hreflangLinks(path: string) {
  const href = absoluteUrl(path);
  return [
    { rel: "alternate" as const, hrefLang: "hy", href },
    { rel: "alternate" as const, hrefLang: "ru", href },
    { rel: "alternate" as const, hrefLang: "en", href },
    { rel: "alternate" as const, hrefLang: "x-default", href },
  ];
}
