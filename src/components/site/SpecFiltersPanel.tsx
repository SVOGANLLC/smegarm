import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  specEnumValueLabel,
  specFilterLabel,
  type SpecEnumFacet,
  type SpecFacet,
  type SpecFilters,
  type SpecRangeFacet,
} from "@/lib/spec-filters";

type Props = {
  facets: SpecFacet[];
  active: SpecFilters;
  onToggleEnum: (slug: string, value: string) => void;
  onSetRange: (slug: string, min?: number, max?: number) => void;
  onClearField: (slug: string) => void;
};

export function SpecFiltersPanel({ facets, active, onToggleEnum, onSetRange, onClearField }: Props) {
  const { lang, t } = useI18n();
  const visible = facets.filter((f) => {
    if (f.type === "enum") return f.values.length > 0;
    return f.count > 0;
  });

  if (!visible.length) return null;

  return (
    <div className="space-y-7 border-t border-border pt-7">
      <p className="eyebrow text-muted-foreground">{t("facet.specs")}</p>
      {visible.map((facet) =>
        facet.type === "enum" ? (
          <SpecEnumGroup
            key={facet.slug}
            facet={facet}
            lang={lang}
            selected={(active[facet.slug] as string[] | undefined) ?? []}
            onToggle={(v) => onToggleEnum(facet.slug, v)}
            onClear={() => onClearField(facet.slug)}
          />
        ) : (
          <SpecRangeGroup
            key={facet.slug}
            facet={facet}
            lang={lang}
            active={active[facet.slug] as { min?: number; max?: number } | undefined}
            onApply={(min, max) => onSetRange(facet.slug, min, max)}
            onClear={() => onClearField(facet.slug)}
          />
        ),
      )}
    </div>
  );
}

function SpecEnumGroup({
  facet,
  lang,
  selected,
  onToggle,
  onClear,
}: {
  facet: SpecEnumFacet;
  lang: "ru" | "en" | "hy";
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(selected.length > 0);
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const shown = expanded ? facet.values : facet.values.slice(0, 6);
  const label = specFilterLabel(facet, lang);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-1.5">
          {selected.length > 0 && (
            <button type="button" onClick={onClear} className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              × {t("catalog.reset")}
            </button>
          )}
          {shown.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => onToggle(item.value)}
                className="h-3.5 w-3.5 accent-foreground"
              />
              <span className="flex-1">{specEnumValueLabel(facet.slug, item.value, lang)}</span>
              <span className="text-[11px] text-muted-foreground">{item.count}</span>
            </label>
          ))}
          {facet.values.length > 6 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              {expanded ? "−" : `+ ${facet.values.length - 6}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SpecRangeGroup({
  facet,
  lang,
  active,
  onApply,
  onClear,
}: {
  facet: SpecRangeFacet;
  lang: "ru" | "en" | "hy";
  active?: { min?: number; max?: number };
  onApply: (min?: number, max?: number) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const label = specFilterLabel(facet, lang);
  const unit = facet.unit ?? "mm";
  const [open, setOpen] = useState(!!active);
  const [minVal, setMinVal] = useState(active?.min ?? facet.min);
  const [maxVal, setMaxVal] = useState(active?.max ?? facet.max);

  const hasActive = active?.min != null || active?.max != null;

  const bounds = useMemo(
    () => ({ min: Math.floor(facet.min), max: Math.ceil(facet.max) }),
    [facet.min, facet.max],
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">
          {label}
          {hasActive && (
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              {active?.min ?? bounds.min}–{active?.max ?? bounds.max} {unit}
            </span>
          )}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">
              {t("facet.rangeMin")}
              <input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={minVal}
                onChange={(e) => setMinVal(Number(e.target.value))}
                className="mt-1 w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              {t("facet.rangeMax")}
              <input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={maxVal}
                onChange={(e) => setMaxVal(Number(e.target.value))}
                className="mt-1 w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            value={maxVal}
            onChange={(e) => setMaxVal(Number(e.target.value))}
            className="w-full accent-foreground"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onApply(minVal, maxVal)}
              className="flex-1 rounded-sm border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] hover:border-foreground"
            >
              {t("facet.apply")}
            </button>
            {hasActive && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-sm border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {bounds.min}–{bounds.max} {unit} · {facet.count} {t("catalog.modelsSuffix")}
          </p>
        </div>
      )}
    </div>
  );
}
