import type { CSSProperties } from "react";
import type { Theme } from "@/lib/products";

type ColourSource = {
  theme_key?: string | null;
  colour?: string | null;
  colour_en?: string | null;
  name?: string | null;
};

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

const COLLECTION_DEFAULT_THEME: Record<string, string> = {
  porsche: "porsche_917",
  "blu-mediterraneo": "dg_blu_mediterraneo",
  "dolce-gabbana-sicily": "dg_sicily",
  "divina-cucina": "dg_sicily",
  "dolce-gabbana": "dg_sicily",
};

export function resolveCollectionBackgroundThemeKey(
  slug: string,
  colourFilter: string | undefined,
  products: ColourSource[],
): string | null {
  const colours = colourFilter?.split(",").map((c) => c.trim()).filter(Boolean) ?? [];
  const sample =
    colours.length > 0
      ? products.find((p) => colours.includes(p.colour ?? "") || colours.includes(p.colour_en ?? ""))
      : products[0];

  if (sample?.theme_key) return resolveBackgroundThemeKey(sample);
  return COLLECTION_DEFAULT_THEME[slug] ?? null;
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
