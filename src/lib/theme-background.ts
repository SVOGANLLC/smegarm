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

export const THEME_BG_ASSET_VERSION = 4;

export function themeBackgroundImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  const sep = image.includes("?") ? "&" : "?";
  return `${image}${sep}v=${THEME_BG_ASSET_VERSION}`;
}

const REPEATING_THEME_KEYS = new Set([
  "porsche_green",
  "porsche_white",
  "porsche_917",
  "porsche",
  "dg_sicily",
  "dg",
  "dg_divina_cucina",
]);

export function themeRepeatCssClass(themeKey: string): string {
  if (themeKey === "porsche_917" || themeKey === "porsche") return "theme-bg-repeat theme-bg-repeat--wide";
  if (themeKey.startsWith("porsche")) return "theme-bg-repeat theme-bg-repeat--porsche";
  return "theme-bg-repeat theme-bg-repeat--dg";
}

type ThemePageBackgroundLayer = CSSProperties & {
  mode: "cover" | "repeat";
  image?: string;
  themeKey?: string;
};

export function themePageBackgroundLayerStyle(
  theme: Theme | null | undefined,
): ThemePageBackgroundLayer | null {
  if (!theme) return null;

  const image = theme.background_image;
  const base: ThemePageBackgroundLayer = {
    mode: "cover",
    backgroundColor: theme.background_color ?? undefined,
  };

  if (!image) {
    return theme.background_color ? { ...base, mode: "repeat" } : null;
  }

  if (REPEATING_THEME_KEYS.has(theme.key)) {
    const bgUrl = themeBackgroundImageUrl(image);
    return {
      ...base,
      mode: "repeat",
      themeKey: theme.key,
      backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
    };
  }

  return {
    ...base,
    mode: "cover",
    image: themeBackgroundImageUrl(image) ?? undefined,
  };
}

/** @deprecated Prefer ThemePageBackground — inline styles blur with background-attachment: fixed. */
export function themeBackgroundStyle(theme: Theme | null | undefined): CSSProperties {
  const layer = themePageBackgroundLayerStyle(theme);
  if (!layer) return {};
  const { mode: _mode, image: _image, ...style } = layer;
  return style;
}
