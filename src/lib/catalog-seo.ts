import { categoryLabel, familyLabel } from "@/lib/category-i18n";
import { breadcrumbJsonLd, canonicalLink, faqJsonLd, hreflangLinks, seoMeta, type FaqItem } from "@/lib/seo";

import { sectionTitleKey, type CatalogSection } from "@/lib/catalog-sections";
import { getI18nDefaults } from "@/lib/i18n";

export type CatalogSeoSearch = {
  category?: string;
  family?: string;
  q?: string;
  colour?: string;
  aesthetic?: string;
  theme?: string;
  flag?: string;
  inStock?: boolean;
  sort?: string;
  spec?: string;
  section?: CatalogSection;
  navGroup?: string;
  model?: string;
  modelSkus?: string;
  page?: number;
};

const CANONICAL_KEYS = [
  "section",
  "navGroup",
  "category",
  "family",
  "q",
  "colour",
  "aesthetic",
  "theme",
  "flag",
  "inStock",
] as const;

function splitCsv(v?: string): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

/** Stable catalog URL for canonical/hreflang — strips pagination, sort, specs, model picker. */
export function catalogCanonicalPath(search: CatalogSeoSearch): string {
  const params = new URLSearchParams();
  for (const key of CANONICAL_KEYS) {
    const raw = search[key];
    if (raw === undefined || raw === "" || raw === false) continue;
    if (key === "colour" || key === "aesthetic") {
      if (splitCsv(String(raw)).length !== 1) continue;
    }
    if (key === "inStock") {
      if (raw) params.set("inStock", "true");
      continue;
    }
    params.set(key, String(raw));
  }
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

/** Filtered / paginated views should not compete with main catalog URLs in search indexes. */
export function catalogShouldNoindex(search: CatalogSeoSearch): boolean {
  if ((search.page ?? 1) > 1) return true;
  if (search.spec) return true;
  if (search.model || search.modelSkus) return true;
  if (search.sort) return true;
  if (splitCsv(search.colour).length > 1) return true;
  if (splitCsv(search.aesthetic).length > 1) return true;
  return false;
}

export type CatalogBreadcrumbLabels = {
  home: string;
  catalog: string;
  section?: string;
  navGroup?: string;
  category?: string;
  family?: string;
  searchQuery?: string;
};

export function catalogBreadcrumbItems(
  search: CatalogSeoSearch,
  labels: CatalogBreadcrumbLabels,
): Array<{ name: string; path: string }> {
  const items: Array<{ name: string; path: string }> = [
    { name: labels.home, path: "/" },
    { name: labels.catalog, path: "/catalog" },
  ];
  let acc: CatalogSeoSearch = {};

  const push = (name: string | undefined, patch: Partial<CatalogSeoSearch>) => {
    if (!name) return;
    acc = { ...acc, ...patch };
    items.push({ name, path: catalogCanonicalPath(acc) });
  };

  if (search.section) {
    push(labels.section ?? search.section, { section: search.section });
  }
  if (search.navGroup) {
    push(labels.navGroup ?? search.navGroup, { navGroup: search.navGroup });
  }
  if (search.category) {
    push(labels.category ?? search.category, { category: search.category });
  }
  if (search.family) {
    push(labels.family ?? search.family, { family: search.family });
  }
  if (search.q?.trim()) {
    push(labels.searchQuery ?? search.q.trim(), { q: search.q.trim() });
  }

  return items;
}

export function catalogBreadcrumbLabels(
  search: CatalogSeoSearch,
  navGroupTitle?: string,
): CatalogBreadcrumbLabels {
  const hy = getI18nDefaults().hy;
  const sectionKey = sectionTitleKey(search.section);
  return {
    home: "Smeg Armenia",
    catalog: hy["catalog.title"] ?? "Catalogue",
    section: sectionKey ? hy[sectionKey] : undefined,
    navGroup: navGroupTitle,
    category: search.category
      ? categoryLabel(search.category, "en", search.category, search.category)
      : undefined,
    family: search.family ? familyLabel(search.family, "en") : undefined,
    searchQuery: search.q?.trim() ? `«${search.q.trim()}»` : undefined,
  };
}

export function catalogHeadFromSearch(
  search: CatalogSeoSearch,
  navGroupTitle?: string,
  faqs?: FaqItem[],
) {
  const hy = getI18nDefaults().hy;
  const path = catalogCanonicalPath(search);
  const noindex = catalogShouldNoindex(search);
  const crumbs = catalogBreadcrumbItems(search, catalogBreadcrumbLabels(search, navGroupTitle));

  let title = hy["catalog.metaTitle"] ?? "Catalogue — Smeg Armenia";
  const lastCrumb = crumbs[crumbs.length - 1];
  if (lastCrumb && crumbs.length > 2) {
    title = `${lastCrumb.name} — Smeg Armenia`;
  }

  const scripts: Array<{ type: "application/ld+json"; children: string }> = [
    {
      type: "application/ld+json" as const,
      children: JSON.stringify(breadcrumbJsonLd(crumbs)),
    },
  ];
  if (faqs?.length) {
    scripts.push({
      type: "application/ld+json" as const,
      children: JSON.stringify(faqJsonLd(faqs)),
    });
  }

  return {
    meta: seoMeta({
      title,
      description: hy["catalog.metaDesc"] ?? title,
      path,
      keywords: "Smeg catalog Armenia, SMEG appliances Yerevan",
      locale: "hy_AM",
      noindex,
    }),
    links: [...hreflangLinks(path), ...canonicalLink(path)],
    scripts,
  };
}

/** Listing pages with sidebar filters (collection, sale) — canonical stays on base URL. */
export function listingShouldNoindex(search: {
  colour?: string;
  aesthetic?: string;
  spec?: string;
  inStock?: boolean;
  model?: string;
  modelSkus?: string;
}): boolean {
  if (search.spec || search.model || search.modelSkus) return true;
  if (splitCsv(search.colour).length > 0) return true;
  if (splitCsv(search.aesthetic).length > 0) return true;
  if (search.inStock) return true;
  return false;
}

export function listingHeadExtras(basePath: string, search: Parameters<typeof listingShouldNoindex>[0]) {
  const noindex = listingShouldNoindex(search);
  if (!noindex) {
    return {
      links: [...hreflangLinks(basePath), ...canonicalLink(basePath)],
      scripts: [] as Array<{ type: "application/ld+json"; children: string }>,
    };
  }
  return {
    meta: [{ name: "robots", content: "noindex, follow" }],
    links: [...canonicalLink(basePath)],
    scripts: [] as Array<{ type: "application/ld+json"; children: string }>,
  };
}

export function collectionBreadcrumbJsonLd(slug: string, collectionName: string) {
  const hy = getI18nDefaults().hy;
  return breadcrumbJsonLd([
    { name: "Smeg Armenia", path: "/" },
    { name: hy["catalog.title"] ?? "Catalogue", path: "/catalog" },
    { name: collectionName, path: `/collection/${slug}` },
  ]);
}
