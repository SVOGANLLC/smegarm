import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type SpecRangeFilter = { min?: number; max?: number };
export type SpecFilters = Record<string, string[] | SpecRangeFilter>;

export type SpecEnumFacet = {
  slug: string;
  type: "enum";
  label_en: string;
  label_ru?: string | null;
  label_hy?: string | null;
  unit?: string | null;
  values: Array<{ value: string; count: number }>;
};

export type SpecRangeFacet = {
  slug: string;
  type: "range";
  label_en: string;
  label_ru?: string | null;
  label_hy?: string | null;
  unit?: string | null;
  min: number;
  max: number;
  count: number;
};

export type SpecFacet = SpecEnumFacet | SpecRangeFacet;

export function specFilterLabel(f: Pick<SpecFacet, "label_en" | "label_ru" | "label_hy">, lang: Lang): string {
  if (lang === "ru" && f.label_ru) return f.label_ru;
  if (lang === "hy" && f.label_hy) return f.label_hy;
  return f.label_en;
}

/** Human-readable enum value (installation, power_source, etc.) */
export function specEnumValueLabel(slug: string, value: string, lang: Lang): string {
  const key = `spec.value.${slug}.${value}`;
  const dict = SPEC_VALUE_I18N[lang]?.[key];
  if (dict) return dict;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SPEC_VALUE_I18N: Record<Lang, Record<string, string>> = {
  ru: {
    "spec.value.installation.built_in": "Встраиваемая",
    "spec.value.installation.freestanding": "Отдельностоящая",
    "spec.value.installation.fully_integrated": "Полностью встраиваемая",
    "spec.value.installation.partially_integrated": "Частично встраиваемая",
    "spec.value.power_source.mains": "От сети",
    "spec.value.power_source.battery": "Аккумулятор",
    "spec.value.hob_type.gas": "Газ",
    "spec.value.hob_type.induction": "Индукция",
    "spec.value.hob_type.ceramic": "Керамика",
    "spec.value.hob_type.mixed": "Комбинированная",
    "spec.value.hob_type.induction_hood": "Индукция с вытяжкой",
    "spec.value.hob_type.teppanyaki": "Теппанъяки",
    "spec.value.toaster_slots.2": "2 слота",
    "spec.value.toaster_slots.4": "4 слота",
    "spec.value.coffee_type.automatic": "Автоматическая",
    "spec.value.coffee_type.portafilter": "Рожковая",
    "spec.value.coffee_type.drip": "Капельная",
    "spec.value.juicer_type.citrus": "Цитрусовая",
    "spec.value.juicer_type.centrifugal": "Центробежная",
    "spec.value.fridge_type.single_door": "Однодверный",
    "spec.value.fridge_type.double_door": "Двухдверный",
    "spec.value.fridge_type.side_by_side": "Side-by-Side",
    "spec.value.fridge_type.wine": "Винный шкаф",
    "spec.value.oven_type.electric": "Электрический",
    "spec.value.oven_type.combi": "Комбинированный",
    "spec.value.hood_install.wall": "Настенная",
    "spec.value.hood_install.island": "Островная",
    "spec.value.hood_install.integrated": "Встраиваемая",
    "spec.value.hood_install.ceiling": "Потолочная",
    "spec.value.hood_install.downdraft": "DownDraft",
    "spec.value.dishwasher_width_cm.45": "45 см",
    "spec.value.dishwasher_width_cm.60": "60 см",
  },
  en: {
    "spec.value.installation.built_in": "Built-in",
    "spec.value.installation.freestanding": "Freestanding",
    "spec.value.installation.fully_integrated": "Fully integrated",
    "spec.value.installation.partially_integrated": "Partially integrated",
    "spec.value.power_source.mains": "Mains powered",
    "spec.value.power_source.battery": "Battery",
    "spec.value.hob_type.gas": "Gas",
    "spec.value.hob_type.induction": "Induction",
    "spec.value.hob_type.ceramic": "Ceramic",
    "spec.value.hob_type.mixed": "Mixed",
    "spec.value.hob_type.induction_hood": "Induction with hood",
    "spec.value.hob_type.teppanyaki": "Teppanyaki",
    "spec.value.toaster_slots.2": "2 slots",
    "spec.value.toaster_slots.4": "4 slots",
    "spec.value.coffee_type.automatic": "Automatic",
    "spec.value.coffee_type.portafilter": "Portafilter",
    "spec.value.coffee_type.drip": "Drip",
    "spec.value.juicer_type.citrus": "Citrus",
    "spec.value.juicer_type.centrifugal": "Centrifugal",
    "spec.value.fridge_type.single_door": "Single door",
    "spec.value.fridge_type.double_door": "Double door",
    "spec.value.fridge_type.side_by_side": "Side-by-Side",
    "spec.value.fridge_type.wine": "Wine cooler",
    "spec.value.oven_type.electric": "Electric",
    "spec.value.oven_type.combi": "Combi",
    "spec.value.hood_install.wall": "Wall",
    "spec.value.hood_install.island": "Island",
    "spec.value.hood_install.integrated": "Integrated",
    "spec.value.hood_install.ceiling": "Ceiling",
    "spec.value.hood_install.downdraft": "DownDraft",
    "spec.value.dishwasher_width_cm.45": "45 cm",
    "spec.value.dishwasher_width_cm.60": "60 cm",
  },
  hy: {
    "spec.value.installation.built_in": "Ներկառուցվող",
    "spec.value.installation.freestanding": "Առանձին",
    "spec.value.installation.fully_integrated": "Լիովին ներկառուցվող",
    "spec.value.installation.partially_integrated": "Մասնակի ներկառուցվող",
    "spec.value.power_source.mains": "Ցանցից",
    "spec.value.power_source.battery": "Մարտկոց",
    "spec.value.hob_type.gas": "Գազ",
    "spec.value.hob_type.induction": "Ինդուկցիա",
    "spec.value.hob_type.ceramic": "Կերամիկ",
    "spec.value.hob_type.mixed": "Խառը",
    "spec.value.hob_type.induction_hood": "Ինդուկցիա հեռացման հովանոցով",
    "spec.value.hob_type.teppanyaki": "Տեպպանյակի",
    "spec.value.toaster_slots.2": "2 սլոտ",
    "spec.value.toaster_slots.4": "4 սլոտ",
    "spec.value.coffee_type.automatic": "Ավտոմատ",
    "spec.value.coffee_type.portafilter": "Եղջյուրավոր",
    "spec.value.coffee_type.drip": "Կաթիլային",
    "spec.value.juicer_type.citrus": "Ցիտրուսային",
    "spec.value.juicer_type.centrifugal": "Կենտրոնախույս",
    "spec.value.fridge_type.single_door": "Մեկ դուռ",
    "spec.value.fridge_type.double_door": "Երկու դուռ",
    "spec.value.fridge_type.side_by_side": "Side-by-Side",
    "spec.value.fridge_type.wine": "Գինու պահարան",
    "spec.value.oven_type.electric": "Էլեկտրական",
    "spec.value.oven_type.combi": "Կոմբի",
    "spec.value.hood_install.wall": "Պատի",
    "spec.value.hood_install.island": "Կղզիային",
    "spec.value.hood_install.integrated": "Ներկառուցվող",
    "spec.value.hood_install.ceiling": "Առաստաղային",
    "spec.value.hood_install.downdraft": "DownDraft",
    "spec.value.dishwasher_width_cm.45": "45 սմ",
    "spec.value.dishwasher_width_cm.60": "60 սմ",
  },
};
/** Parse `spec` search param: installation:built_in,freestanding;width_mm:550-650 */
export function parseSpecSearchParam(raw?: string): SpecFilters {
  if (!raw?.trim()) return {};
  const out: SpecFilters = {};
  for (const part of raw.split(";").filter(Boolean)) {
    const [slug, rest] = part.split(":");
    if (!slug || !rest) continue;
    if (rest.includes("-") && !rest.includes(",")) {
      const [a, b] = rest.split("-");
      const min = a ? Number(a) : undefined;
      const max = b ? Number(b) : undefined;
      if (Number.isFinite(min) || Number.isFinite(max)) {
        out[slug] = {
          ...(Number.isFinite(min) ? { min } : {}),
          ...(Number.isFinite(max) ? { max } : {}),
        };
      }
    } else {
      out[slug] = rest.split(",").filter(Boolean);
    }
  }
  return out;
}

export function serializeSpecSearchParam(filters: SpecFilters): string | undefined {
  const parts: string[] = [];
  for (const [slug, val] of Object.entries(filters)) {
    if (Array.isArray(val) && val.length) {
      parts.push(`${slug}:${val.join(",")}`);
    } else if (val && !Array.isArray(val) && (val.min != null || val.max != null)) {
      const min = val.min ?? "";
      const max = val.max ?? "";
      parts.push(`${slug}:${min}-${max}`);
    }
  }
  return parts.length ? parts.join(";") : undefined;
}

export function specFiltersToRpc(filters: SpecFilters): Record<string, unknown> {
  const rpc: Record<string, unknown> = {};
  for (const [slug, val] of Object.entries(filters)) {
    if (Array.isArray(val) && val.length) rpc[slug] = val;
    else if (val && !Array.isArray(val)) rpc[slug] = val;
  }
  return rpc;
}

export function countActiveSpecFilters(filters: SpecFilters): number {
  let n = 0;
  for (const val of Object.values(filters)) {
    if (Array.isArray(val)) n += val.length;
    else if (val.min != null || val.max != null) n += 1;
  }
  return n;
}

export type SpecFacetContext = {
  categories?: string[];
  families?: string[];
  colours?: string[];
  aesthetics?: string[];
  skus?: string[];
  inStock?: boolean;
  active?: SpecFilters;
};

export async function fetchSpecFacets(ctx: SpecFacetContext): Promise<SpecFacet[]> {
  const { data, error } = await supabase.rpc("get_spec_facets", {
    p_categories: ctx.categories?.length ? ctx.categories : null,
    p_families: ctx.families?.length ? ctx.families : null,
    p_colours: ctx.colours?.length ? ctx.colours : null,
    p_aesthetics: ctx.aesthetics?.length ? ctx.aesthetics : null,
    p_in_stock: ctx.inStock ?? false,
    p_active: specFiltersToRpc(ctx.active ?? {}),
    p_skus: ctx.skus?.length ? ctx.skus : null,
  });
  if (error) throw error;
  return (data ?? []) as SpecFacet[];
}

export async function fetchSkusMatchingSpecFilters(filters: SpecFilters): Promise<string[] | null> {
  if (!Object.keys(filters).length) return null;
  const { data, error } = await supabase.rpc("skus_matching_spec_filters", {
    p_filters: specFiltersToRpc(filters),
  });
  if (error) throw error;
  return (data as string[] | null) ?? [];
}
