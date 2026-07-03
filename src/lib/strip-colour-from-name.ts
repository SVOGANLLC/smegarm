import { COLOUR_LABELS } from "./colour-i18n.ts";

export type ColourMember = {
  colour?: string | null;
  colour_en?: string | null;
  colour_hy?: string | null;
};

const RU_COLOUR_VARIANTS: Record<string, string[]> = {
  черн: ["черный", "черная", "черное", "черной", "черного", "черному", "черным", "черную", "черные", "черных"],
  бел: ["белый", "белая", "белое", "белой", "белого", "белому", "белым", "белую", "белые", "белых"],
  сер: ["серый", "серая", "серое", "серой", "серого", "серому", "серым", "серую", "серые", "серых"],
  красн: ["красный", "красная", "красное", "красной", "красного", "красному", "красным", "красную", "красные", "красных"],
  син: ["синий", "синяя", "синее", "синей", "синего", "синему", "синим", "синюю", "синие", "синих"],
  зелен: ["зеленый", "зеленая", "зеленое", "зеленой", "зеленого", "зеленому", "зеленым", "зеленую", "зеленые", "зеленых"],
  розов: ["розовый", "розовая", "розовое", "розовой", "розового", "розовому", "розовым", "розовую", "розовые", "розовых"],
  желт: ["желтый", "желтая", "желтое", "желтой", "желтого", "желтому", "желтым", "желтую", "желтые", "желтых"],
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addRuVariants(tokens: Set<string>, ru: string) {
  const lower = ru.toLowerCase();
  tokens.add(ru);
  tokens.add(lower);
  for (const [stem, forms] of Object.entries(RU_COLOUR_VARIANTS)) {
    if (lower.includes(stem)) {
      for (const f of forms) tokens.add(f);
    }
  }
}

/** Collect colour tokens (all languages) from group members + dictionary. */
export function collectColourTokens(members: ColourMember[]): string[] {
  const tokens = new Set<string>();

  for (const m of members) {
    for (const raw of [m.colour, m.colour_en, m.colour_hy]) {
      const v = raw?.trim();
      if (v) tokens.add(v);
    }

    const canonical = (m.colour_en ?? m.colour ?? "").trim();
    if (!canonical) continue;

    const dict = COLOUR_LABELS[canonical];
    if (dict) {
      tokens.add(canonical);
      addRuVariants(tokens, dict.ru);
      tokens.add(dict.en);
      tokens.add(dict.en.toLowerCase());
      tokens.add(dict.hy);
      tokens.add(dict.hy.toLowerCase());
    } else if (/^[A-Za-z]/.test(canonical)) {
      tokens.add(canonical);
      tokens.add(canonical.toLowerCase());
    } else {
      addRuVariants(tokens, canonical);
    }
  }

  tokens.add("color");
  tokens.add("colour");
  tokens.add("цвет");
  tokens.add("цвета");
  tokens.add("գույն");

  // Common RU phrasing variants not always present in product.colour
  for (const phrase of [
    "пастельно-голубой",
    "пастельно-голубая",
    "пастельный голубой",
    "пастельная голубая",
    "пастельный синий",
    "пастельная синяя",
    "изумрудный зеленый",
    "изумрудно-зеленый",
    "цвета крема",
    "кремового цвета",
    "серебро",
    "серебристый",
    "серебряный",
  ]) {
    tokens.add(phrase);
  }

  return [...tokens].filter((t) => t.length >= 2).sort((a, b) => b.length - a.length);
}

function normalizeStrippedName(name: string): string {
  return name
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s·•\-–—/]+/u, "")
    .replace(/[,;:\-–—\s]+$/u, "")
    .trim();
}

const CYR = "[\\p{L}]+";

/** Strip compound / idiomatic colour phrases that token matching misses. */
function stripCompoundColourPhrases(name: string): string {
  let result = name;
  const patterns: Array<{ re: RegExp; repl: string }> = [
    { re: new RegExp(`,\\s*пастельно-?\\s*(?:голуб|син|зелен)${CYR}`, "giu"), repl: "" },
    { re: new RegExp(`,\\s*пастельн${CYR}\\s+(?:голуб|син|зелен)${CYR}`, "giu"), repl: "" },
    { re: /пастельный\s+синий\s+/giu, repl: "" },
    { re: /\s+цвета\s*,/giu, repl: ", " },
    { re: /цвета\s+крема,\s*/giu, repl: "" },
    { re: /,?\s*кремового\s+цвета/giu, repl: "" },
    { re: /,\s*серебро\s*$/giu, repl: "" },
    { re: /[«""][^«"""]*(?:зелен|син|красн|голуб|крем|черн|бел)[^«"""]*[«""]/giu, repl: "" },
    { re: new RegExp(`,\\s*пастельно-голубая\\s*$`, "giu"), repl: "" },
    { re: /,\s*пастельный\s+синий(?:\s+глянцевая)?/giu, repl: "" },
    { re: /\s+Անտրաց[\p{L}]*\s+շրջանակ/giu, repl: " շրջանակ" },
  ];
  for (const { re, repl } of patterns) {
    const next = result.replace(re, repl);
    if (next.length >= 3) result = next;
  }
  return normalizeStrippedName(result);
}

export function stripColourFromName(name: string, tokens: string[]): string {
  let result = name.trim();
  if (!result) return result;

  const sorted = [...tokens].sort((a, b) => b.length - a.length);

  for (const token of sorted) {
    if (!token || token.length < 2) continue;
    const escaped = escapeRegex(token);
    const patterns = [
      { re: new RegExp(`^${escaped}[,\\s·•\\-–—/]+`, "iu"), repl: "" },
      { re: new RegExp(`[,\\s·•]+${escaped}[,\\s·•]+`, "iu"), repl: ", " },
      { re: new RegExp(`[,\\s·•]+цвет\\s+${escaped}\\s*$`, "iu"), repl: "" },
      { re: new RegExp(`[,\\s·•\\-–—/]+${escaped}\\s*$`, "iu"), repl: "" },
      { re: new RegExp(`\\s+${escaped}\\s*$`, "iu"), repl: "" },
      { re: new RegExp(`\\s+${escaped}՝\\s+`, "iu"), repl: " " },
      { re: new RegExp(`\\s+${escaped}\\s+շրջանակ`, "iu"), repl: " շրջանակ" },
    ];
    for (const { re, repl } of patterns) {
      const next = result.replace(re, repl).trim();
      if (next.length >= 3) result = next;
    }
  }

  result = stripCompoundColourPhrases(result);

  result = result
    .replace(/[,\\s]+(color|colour|цвет|цвета|գույն)\s*$/iu, "")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s·•\-–—/]+/u, "")
    .replace(/[,;:\-–—\s]+$/u, "")
    .trim();

  return result;
}

export function proposeGroupNames(
  members: ColourMember[],
  sources: { ru?: string; en?: string; hy?: string },
): { name_ru: string; name_en: string; name_hy: string } {
  const tokens = collectColourTokens(members);
  const ru = stripColourFromName(sources.ru ?? "", tokens);
  const en = stripColourFromName(sources.en ?? "", tokens);
  const hy = stripColourFromName(sources.hy ?? "", tokens);
  return { name_ru: ru, name_en: en, name_hy: hy };
}
