export type ContentStyle = {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  letterSpacing?: string;
  lineHeight?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle?: "normal" | "italic";
};

export type ContentStylesMap = Record<string, ContentStyle>;

/** Curated Google Fonts the admin can pick. The first entries are local stack fallbacks. */
export const FONT_OPTIONS: { label: string; value: string; google?: string }[] = [
  { label: "По умолчанию", value: "" },
  { label: "Futura Std (сайт)", value: '"Futura Std", "Futura", sans-serif' },
  { label: "Playfair Display", value: '"Playfair Display", serif', google: "Playfair+Display:wght@400;500;600;700;800" },
  { label: "Cormorant Garamond", value: '"Cormorant Garamond", serif', google: "Cormorant+Garamond:wght@300;400;500;600;700" },
  { label: "EB Garamond", value: '"EB Garamond", serif', google: "EB+Garamond:wght@400;500;600;700" },
  { label: "Lora", value: '"Lora", serif', google: "Lora:wght@400;500;600;700" },
  { label: "DM Serif Display", value: '"DM Serif Display", serif', google: "DM+Serif+Display" },
  { label: "Inter", value: '"Inter", sans-serif', google: "Inter:wght@300;400;500;600;700;800" },
  { label: "Manrope", value: '"Manrope", sans-serif', google: "Manrope:wght@300;400;500;600;700;800" },
  { label: "Space Grotesk", value: '"Space Grotesk", sans-serif', google: "Space+Grotesk:wght@300;400;500;600;700" },
  { label: "Montserrat", value: '"Montserrat", sans-serif', google: "Montserrat:wght@300;400;500;600;700;800" },
  { label: "Poppins", value: '"Poppins", sans-serif', google: "Poppins:wght@300;400;500;600;700;800" },
  { label: "Work Sans", value: '"Work Sans", sans-serif', google: "Work+Sans:wght@300;400;500;600;700" },
  { label: "IBM Plex Sans", value: '"IBM Plex Sans", sans-serif', google: "IBM+Plex+Sans:wght@300;400;500;600;700" },
  { label: "Bebas Neue", value: '"Bebas Neue", sans-serif', google: "Bebas+Neue" },
  { label: "Oswald", value: '"Oswald", sans-serif', google: "Oswald:wght@300;400;500;600;700" },
  { label: "Anton", value: '"Anton", sans-serif', google: "Anton" },
  { label: "Archivo", value: '"Archivo", sans-serif', google: "Archivo:wght@300;400;500;600;700;800" },
];

const escape = (k: string) => k.replace(/"/g, '\\"');

export function stylesToCss(map: ContentStylesMap): string {
  const rules: string[] = [];
  for (const [key, s] of Object.entries(map)) {
    if (!s || typeof s !== "object") continue;
    const decls: string[] = [];
    if (s.fontFamily) decls.push(`font-family: ${s.fontFamily} !important`);
    if (s.fontSize) decls.push(`font-size: ${s.fontSize} !important`);
    if (s.fontWeight) decls.push(`font-weight: ${s.fontWeight} !important`);
    if (s.color) decls.push(`color: ${s.color} !important`);
    if (s.letterSpacing) decls.push(`letter-spacing: ${s.letterSpacing} !important`);
    if (s.lineHeight) decls.push(`line-height: ${s.lineHeight} !important`);
    if (s.textTransform) decls.push(`text-transform: ${s.textTransform} !important`);
    if (s.fontStyle) decls.push(`font-style: ${s.fontStyle} !important`);
    if (!decls.length) continue;
    rules.push(`[data-ck="${escape(key)}"]{${decls.join(";")}}`);
  }
  return rules.join("\n");
}

export function collectGoogleFonts(map: ContentStylesMap): string[] {
  const used = new Set<string>();
  for (const s of Object.values(map)) {
    if (!s?.fontFamily) continue;
    const match = FONT_OPTIONS.find((f) => f.value === s.fontFamily);
    if (match?.google) used.add(match.google);
  }
  return Array.from(used);
}