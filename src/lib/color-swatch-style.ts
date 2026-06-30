/** Visual treatment for colour swatch circles (matte vs gloss, dark rim). */

const MATTE_COLOUR = /\b(matt|matte|mat\b|satin|brushed|inox look)\b/i;

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
  if (/white|cream/i.test(colourName) && hexToLuminance(hex) > 0.85) {
    return "border border-black/10";
  }
  return "border border-border";
}
