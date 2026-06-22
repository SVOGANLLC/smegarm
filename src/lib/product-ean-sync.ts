export type SpecsLocale = "ru" | "en" | "hy";

const EAN_SPEC_KEYS: Record<SpecsLocale, readonly string[]> = {
  ru: ["Код EAN"],
  en: ["EAN code", "EAN Code"],
  hy: ["EAN կոդ"],
};

export function normalizeEan(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 32);
}

export function specsToText(v: Record<string, string> | null | undefined): string {
  if (!v || !Object.keys(v).length) return "";
  return JSON.stringify(v, null, 2);
}

export function parseSpecsText(raw: string): Record<string, string> {
  const t = raw.trim();
  if (!t) return {};
  try {
    const parsed = JSON.parse(t) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
      );
    }
  } catch {
    /* line format fallback */
  }
  const out: Record<string, string> = {};
  for (const line of t.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function isJsonSpecsText(text: string): boolean {
  const t = text.trim();
  return !t || t.startsWith("{");
}

function setEanInSpecsObj(
  obj: Record<string, string>,
  ean: string,
  locale: SpecsLocale,
): Record<string, string> {
  const out = { ...obj };
  for (const k of EAN_SPEC_KEYS[locale]) {
    delete out[k];
  }
  if (ean) out[EAN_SPEC_KEYS[locale][0]] = ean;
  return out;
}

function extractEanFromSpecsObj(obj: Record<string, string>, locale: SpecsLocale): string {
  for (const k of EAN_SPEC_KEYS[locale]) {
    const v = obj[k]?.trim();
    if (v) return normalizeEan(v);
  }
  return "";
}

function rewriteSpecsObject(text: string, obj: Record<string, string>): string {
  if (!Object.keys(obj).length) return "";
  if (isJsonSpecsText(text)) return JSON.stringify(obj, null, 2);
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function updateEanInSpecsText(text: string, ean: string, locale: SpecsLocale): string {
  const keys = EAN_SPEC_KEYS[locale];
  const canonical = keys[0];
  const trimmed = text.trim();

  if (!trimmed || trimmed.startsWith("{")) {
    const obj = setEanInSpecsObj(parseSpecsText(text), ean, locale);
    return rewriteSpecsObject(text, obj);
  }

  const lines = text.split("\n");
  let found = false;
  const next = lines.flatMap((line) => {
    const idx = line.indexOf(":");
    if (idx <= 0) return [line];
    const key = line.slice(0, idx).trim();
    if (!keys.includes(key)) return [line];
    found = true;
    return ean ? [`${canonical}: ${ean}`] : [];
  });
  if (ean && !found) next.push(`${canonical}: ${ean}`);
  return next.join("\n");
}

export type EanFormSlice = {
  ean: string;
  specs: string;
  specs_en: string;
  specs_hy: string;
};

/** Propagate dedicated EAN field to all specs locales. */
export function syncEanFieldToSpecs<T extends EanFormSlice>(form: T): T {
  const ean = normalizeEan(form.ean);
  return {
    ...form,
    ean,
    specs: updateEanInSpecsText(form.specs, ean, "ru"),
    specs_en: updateEanInSpecsText(form.specs_en, ean, "en"),
    specs_hy: updateEanInSpecsText(form.specs_hy, ean, "hy"),
  };
}

/** After EAN changed inside one specs block, sync column + other locales. */
export function syncEanFromSpecsEdit<T extends EanFormSlice>(
  form: T,
  locale: SpecsLocale,
  specsText: string,
): T {
  const ean = extractEanFromSpecsObj(parseSpecsText(specsText), locale);
  const field = locale === "ru" ? "specs" : locale === "en" ? "specs_en" : "specs_hy";
  const next = { ...form, [field]: specsText, ean };
  if (locale !== "ru") next.specs = updateEanInSpecsText(form.specs, ean, "ru");
  if (locale !== "en") next.specs_en = updateEanInSpecsText(form.specs_en, ean, "en");
  if (locale !== "hy") next.specs_hy = updateEanInSpecsText(form.specs_hy, ean, "hy");
  return next;
}

/** Resolve a single EAN before save (field wins, else first specs locale). */
export function normalizeEanForSave<T extends EanFormSlice>(form: T): T {
  const fromField = normalizeEan(form.ean);
  const fromSpecs =
    fromField ||
    extractEanFromSpecsObj(parseSpecsText(form.specs), "ru") ||
    extractEanFromSpecsObj(parseSpecsText(form.specs_en), "en") ||
    extractEanFromSpecsObj(parseSpecsText(form.specs_hy), "hy");
  return syncEanFieldToSpecs({ ...form, ean: fromSpecs });
}
