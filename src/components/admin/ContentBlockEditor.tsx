import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n, getI18nDefaults, type Lang } from "@/lib/i18n";
import type { ContentStyle, ContentStylesMap } from "@/lib/content-styles";
import { FONT_OPTIONS } from "@/lib/content-styles";
import { CategoriesContentEditor } from "@/components/admin/CategoriesContentEditor";
import { HomepageProductsEditor } from "@/components/admin/HomepageProductsEditor";

type Field = { i18nKey: string; labelKey: string; multiline?: boolean; labelVars?: Record<string, string | number> };
export type ContentBlock = { key: string; labelKey: string; fields: Field[] };

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

const LANGS: { code: Lang; labelKey: string }[] = [
  { code: "ru", labelKey: "admin.content.langRu" },
  { code: "en", labelKey: "admin.content.langEn" },
  { code: "hy", labelKey: "admin.content.langHy" },
];

export function ContentBlockEditor({
  block,
  value,
  styles,
  onFieldChange,
  onStyleChange,
  onValueReplace,
  onPersist,
  simple = false,
}: {
  block: ContentBlock;
  value: BlockValue;
  styles: ContentStylesMap;
  onFieldChange: (i18nKey: string, lang: Lang, text: string) => void;
  onStyleChange: (i18nKey: string, patch: Partial<ContentStyle>) => void;
  onValueReplace?: (next: BlockValue) => void;
  onPersist?: (next: BlockValue) => Promise<void>;
  simple?: boolean;
}) {
  const { t } = useI18n();
  const defaults = getI18nDefaults();
  const [open, setOpen] = useState(true);
  const [showStyles, setShowStyles] = useState<Record<string, boolean>>({});

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="font-serif text-xl">{t(block.labelKey)}</h2>
        <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
          {block.fields.map((f) => (
            <div key={f.i18nKey} className="rounded-sm bg-secondary/30 p-4">
              <p className="text-sm font-medium">{t(f.labelKey, f.labelVars)}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {LANGS.map((l) => (
                  <label key={l.code} className="block">
                    <span className="eyebrow mb-1 block text-muted-foreground">{t(l.labelKey)}</span>
                    <textarea
                      rows={f.multiline ? 3 : 2}
                      value={value[f.i18nKey]?.[l.code] ?? ""}
                      placeholder={defaults[l.code][f.i18nKey] ?? ""}
                      onChange={(e) => onFieldChange(f.i18nKey, l.code, e.target.value)}
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </label>
                ))}
              </div>
              {!simple && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowStyles((p) => ({ ...p, [f.i18nKey]: !p[f.i18nKey] }))}
                    className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                  >
                    {showStyles[f.i18nKey] ? "− " : "+ "}
                    {t("admin.content.styleTitle")}
                  </button>
                  {showStyles[f.i18nKey] && (
                    <StyleEditor value={styles[f.i18nKey] ?? {}} onChange={(patch) => onStyleChange(f.i18nKey, patch)} />
                  )}
                </>
              )}
            </div>
          ))}
          {block.key === "categories" && onValueReplace && (
            <CategoriesContentEditor value={value} onChange={onValueReplace} onPersist={onPersist} />
          )}
          {block.key === "homepage" && onValueReplace && (
            <HomepageProductsEditor value={value} onChange={onValueReplace} />
          )}
        </div>
      )}
    </div>
  );
}

function StyleEditor({ value, onChange }: { value: ContentStyle; onChange: (patch: Partial<ContentStyle>) => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-sm border border-border bg-background p-3 md:grid-cols-3">
      <Field label={t("admin.content.styleFont")}>
        <select
          value={value.fontFamily ?? ""}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("admin.content.styleSize")}>
        <input
          value={value.fontSize ?? ""}
          onChange={(e) => onChange({ fontSize: e.target.value })}
          placeholder="auto"
          className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label={t("admin.content.styleColor")}>
        <div className="flex gap-2">
          <input
            type="color"
            value={value.color || "#111111"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-12 rounded-sm border border-border"
          />
          <input
            value={value.color ?? ""}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder="auto"
            className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
      </Field>
      <div className="flex items-end md:col-span-3">
        <button
          type="button"
          onClick={() =>
            onChange({
              fontFamily: "",
              fontSize: "",
              fontWeight: "",
              color: "",
              letterSpacing: "",
              lineHeight: "",
              textTransform: undefined,
              fontStyle: undefined,
            })
          }
          className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          {t("admin.content.resetStyle")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
