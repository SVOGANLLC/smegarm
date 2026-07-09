import type { CSSProperties } from "react";
import type { Theme } from "@/lib/products";

type ColourSource = {
  sku?: string | null;
  theme_key?: string | null;
  colour?: string | null;
  colour_en?: string | null;
  name?: string | null;
};

const BLU_MEDITERRANEO_SKUS = new Set([
  "FAB28RDGME6",
  "FAB5RDGME6",
  "KT90DGME",
  "TR90DGME9",
  "MFF01DGBEU",
  "ECF02DGBEU",
  "CJF01DGBEU",
  "CGF01DGBEU",
  "TSF01DGBEU",
  "KLF03DGBEU",
]);

export const BLU_MEDITERRANEO_SWATCH_IMAGE = "/brand/themes/dg-blu.png";

export function isBluMediterraneoSku(sku: string | null | undefined): boolean {
  return !!sku && BLU_MEDITERRANEO_SKUS.has(sku.trim().toUpperCase());
}

export function swatchImageForProduct(
  sku: string | null | undefined,
  colourEn: string | null | undefined,
  mainImage?: string | null,
): string | null {
  if (isBluMediterraneoSku(sku)) return BLU_MEDITERRANEO_SWATCH_IMAGE;
  if (colourEn === "Decorated / Special") return mainImage ?? null;
  return null;
}

export function swatchImageForDecoratedFacet(
  products: Array<{ sku: string; colour_en?: string | null; main_image?: string | null }>,
): string | null {
  if (products.some((p) => isBluMediterraneoSku(p.sku))) return BLU_MEDITERRANEO_SWATCH_IMAGE;
  const decorated = products.find((p) => (p.colour_en ?? "") === "Decorated / Special");
  return decorated?.main_image ?? null;
}

const BLUE_RE = /\b(blue|blu|azzur|azure|navy|голуб|син|կապույ|lan)\b/i;
const YELLOW_RE = /\b(yellow|giall|gold|amber|желт|նարնջ|oro)\b/i;
const RED_RE = /\b(red|salzburg|917|cherry|красн|կարմիր|rosso)\b/i;
const GREEN_RE = /\b(green|shade green|psg|зелен|կանաչ|verde)\b/i;
const WHITE_RE = /\b(white|carrara|pcw|бел|սպիտակ|bianco)\b/i;

function colourBlob(p: ColourSource): string {
  return `${p.colour_en ?? ""} ${p.colour ?? ""} ${p.name ?? ""}`.trim();
}

function isBlueish(p: ColourSource): boolean {
  return BLUE_RE.test(colourBlob(p));
}

function isYellowish(p: ColourSource): boolean {
  return YELLOW_RE.test(colourBlob(p));
}

function isRedish(p: ColourSource): boolean {
  return RED_RE.test(colourBlob(p));
}

function isGreenish(p: ColourSource): boolean {
  return GREEN_RE.test(colourBlob(p));
}

function isWhitish(p: ColourSource): boolean {
  return WHITE_RE.test(colourBlob(p));
}

/** Theme key used to load the background image for a product. */
export function resolveBackgroundThemeKey(product: ColourSource): string | null {
  const sku = product.sku?.trim().toUpperCase();
  if (sku && BLU_MEDITERRANEO_SKUS.has(sku)) return "dg_blu_mediterraneo";

  const key = product.theme_key ?? null;
  if (!key) return null;

  if (key === "dg_divina_cucina") {
    if (isBlueish(product)) return "dg_blu_mediterraneo";
    if (isYellowish(product)) return "dg_sicily";
    return "dg_sicily";
  }

  if (key === "dg" || key === "dg_sicily") return "dg_sicily";
  if (key === "dg_blu_mediterraneo") return "dg_blu_mediterraneo";

  if (key.startsWith("porsche")) {
    if (key === "porsche_green" || key === "porsche_white" || key === "porsche_917") return key;
    if (isWhitish(product)) return "porsche_white";
    if (isGreenish(product)) return "porsche_green";
    if (isRedish(product)) return "porsche_917";
    return "porsche_917";
  }

  return key;
}

const FIXED_COLLECTION_THEME: Record<string, string> = {
  "blu-mediterraneo": "dg_blu_mediterraneo",
  "dolce-gabbana-sicily": "dg_sicily",
  "dolce-gabbana": "dg_sicily",
};

const COLOUR_AWARE_COLLECTIONS = new Set(["porsche", "divina-cucina"]);

export function resolveCollectionBackgroundThemeKey(
  slug: string,
  colourFilter: string | undefined,
  products: ColourSource[],
): string | null {
  if (FIXED_COLLECTION_THEME[slug]) return FIXED_COLLECTION_THEME[slug];

  if (!COLOUR_AWARE_COLLECTIONS.has(slug)) return null;

  const colours = colourFilter?.split(",").map((c) => c.trim()).filter(Boolean) ?? [];
  const sample =
    colours.length > 0
      ? products.find((p) => colours.includes(p.colour ?? "") || colours.includes(p.colour_en ?? ""))
      : products.find((p) => p.theme_key) ?? products[0];

  if (sample?.theme_key) return resolveBackgroundThemeKey(sample);
  if (slug === "porsche") return "porsche_917";
  if (slug === "divina-cucina") return "dg_sicily";
  return null;
}

export function themeBackgroundStyle(theme: Theme | null | undefined): CSSProperties {
  if (!theme) return {};
  return {
    backgroundColor: theme.background_color ?? undefined,
    backgroundImage: theme.background_image ? `url(${theme.background_image})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };
}
