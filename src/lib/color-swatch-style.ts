/** Visual treatment for colour swatch circles (matte vs gloss, dark rim). */

import { COLOUR_LABELS } from "@/lib/colour-i18n";

const MATTE_COLOUR = /\b(matt|matte|mat\b|satin|brushed|inox look)\b|матов|сатин/i;

export function isMatteColour(colourName: string): boolean {
  return MATTE_COLOUR.test(colourName);
}

export function hexToLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isDarkSwatchHex(hex: string): boolean {
  return hexToLuminance(hex) < 0.12;
}

export const GLOSS_HIGHLIGHT =
  "linear-gradient(145deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.18) 22%, transparent 48%, transparent 100%)";

export type SwatchSize = "sm" | "md" | "lg";

export const SWATCH_SIZE_CLASS: Record<SwatchSize, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export function swatchBorderClass(hex: string, colourName: string): string {
  if (isDarkSwatchHex(hex)) {
    return "border border-white/30 ring-1 ring-inset ring-white/25";
  }
  if (/white|cream|бел|кремов|светл/i.test(colourName) && hexToLuminance(hex) > 0.85) {
    return "border border-black/10";
  }
  return "border border-border";
}

/** Shown when a colour has no swatch row at all. */
export const DEFAULT_SWATCH_HEX = "#d4d4d4";

export type SwatchRow = { colour: string; hex: string };

const FINISH_WORDS =
  "matt|matte|mat|gloss|glossy|satin|shiny|polished|brushed|матовый|мат|глянцевый|сатин";
const FINISH_PREFIX = new RegExp(`^(?:${FINISH_WORDS})\\s+`, "i");
const FINISH_SUFFIX = new RegExp(`\\s+(?:${FINISH_WORDS})$`, "i");

/** Case/space/ё-insensitive key so "Матовый чёрный" and "матовый черный" match. */
const normalizeColour = (name: string) =>
  name.trim().replace(/ё/gi, "е").replace(/\s+/g, " ").toLowerCase();

/**
 * Colour name without its finish prefix/suffix: "Matt Storm Blue" → "Storm Blue",
 * "Матовый черный" → "черный".
 * `color_swatches` keeps base colours plus a few explicit "Matt …" rows, while
 * products often carry the finish in the colour name itself.
 */
export function baseColourName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const stripped = trimmed.replace(FINISH_PREFIX, "").replace(FINISH_SUFFIX, "").trim();
  return stripped || trimmed;
}

export function isFinishWordName(name: string): boolean {
  const stripped = name.trim().replace(FINISH_PREFIX, "").replace(FINISH_SUFFIX, "").trim();
  return stripped !== name.trim();
}

/**
 * `color_swatches.colour` holds the English name, while `products.colour` holds the
 * localised one ("Нержавеющая сталь" / "Матовый черный"). The label dictionary is the
 * bridge between the two, so every swatch row also answers to its RU/HY spellings.
 */
let labelIndexCache: Map<string, string> | null = null;

/** Localised spelling → canonical English colour name. */
function labelIndex(): Map<string, string> {
  if (labelIndexCache) return labelIndexCache;
  const map = new Map<string, string>();
  const add = (name: string, canonical: string) => {
    const key = normalizeColour(name);
    if (key && !map.has(key)) map.set(key, canonical);
  };
  for (const [key, value] of Object.entries(COLOUR_LABELS)) {
    add(key, key);
    add(value.en, key);
    add(value.ru, key);
    add(value.hy, key);
  }
  labelIndexCache = map;
  return map;
}

function colourAliases(canonical: string): string[] {
  const canonicalEn = labelIndex().get(normalizeColour(canonical));
  if (!canonicalEn || canonicalEn === canonical) return [];
  const entry = COLOUR_LABELS[canonicalEn];
  return entry ? [entry.en, entry.ru, entry.hy] : [];
}

/**
 * "Decorated / Special" swatch in any language ("Декорированный / Специальный").
 * Those rows render the product photo instead of a flat colour.
 */
export function isDecoratedColour(name: string): boolean {
  return labelIndex().get(normalizeColour(name)) === "Decorated / Special";
}

const swatchIndexCache = new WeakMap<object, Map<string, string>>();

function swatchIndex(swatches: ReadonlyArray<SwatchRow>): Map<string, string> {
  const cached = swatchIndexCache.get(swatches);
  if (cached) return cached;
  const map = new Map<string, string>();
  const add = (name: string, hex: string) => {
    const key = normalizeColour(name);
    if (key && !map.has(key)) map.set(key, hex);
  };
  for (const s of swatches) {
    const canonical = (s.colour ?? "").trim();
    if (!canonical) continue;
    add(canonical, s.hex);
    for (const alias of colourAliases(canonical)) add(alias, s.hex);
  }
  swatchIndexCache.set(swatches, map);
  return map;
}

/**
 * Hex for a product colour name.
 * Lookup order: exact name (EN or localised), then the same name without its finish
 * word, so "Матовый Emerald Green" and "Matt Emerald Green" both resolve to the
 * "Emerald Green" swatch instead of falling back to grey.
 */
export function resolveSwatchHex(
  swatches: ReadonlyArray<SwatchRow> | null | undefined,
  colourName: string | null | undefined,
): string | undefined {
  if (!swatches?.length || !colourName?.trim()) return undefined;
  const index = swatchIndex(swatches);

  const exact = index.get(normalizeColour(colourName));
  if (exact) return exact;

  const base = baseColourName(colourName);
  if (base && base !== colourName.trim()) {
    const withoutFinish = index.get(normalizeColour(base));
    if (withoutFinish) return withoutFinish;
  }

  return index.get(normalizeColour(base));
}

/** Same as {@link resolveSwatchHex} but never returns undefined. */
export function swatchHexFor(
  swatches: ReadonlyArray<SwatchRow> | null | undefined,
  colourName: string | null | undefined,
): string {
  return resolveSwatchHex(swatches, colourName) ?? DEFAULT_SWATCH_HEX;
}
