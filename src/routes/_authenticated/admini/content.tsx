import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getI18nDefaults, useI18n, type Lang } from "@/lib/i18n";
import { FONT_OPTIONS, type ContentStyle, type ContentStylesMap } from "@/lib/content-styles";
import { CategoriesContentEditor } from "@/components/admin/CategoriesContentEditor";
import { HomepageProductsEditor } from "@/components/admin/HomepageProductsEditor";

export const Route = createFileRoute("/_authenticated/admini/content")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: ContentPage,
});

type Field = { i18nKey: string; labelKey: string; multiline?: boolean; labelVars?: Record<string, string | number> };
type Block = { key: string; labelKey: string; fields: Field[] };

const BLOCKS: Block[] = [
  {
    key: "hero",
    labelKey: "admin.content.block.hero",
    fields: [
      { i18nKey: "hero.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "hero.title", labelKey: "admin.content.field.title", multiline: true },
      { i18nKey: "hero.subtitle", labelKey: "admin.content.field.subtitle", multiline: true },
      { i18nKey: "hero.cta", labelKey: "admin.content.field.cta1" },
      { i18nKey: "hero.cta2", labelKey: "admin.content.field.cta2" },
      { i18nKey: "hero.scroll", labelKey: "admin.content.field.scroll" },
      { i18nKey: "hero.quote", labelKey: "admin.content.field.quote" },
      { i18nKey: "hero.quoteCaption", labelKey: "admin.content.field.quoteCaption" },
    ],
  },
  {
    key: "story",
    labelKey: "admin.content.block.story",
    fields: [
      { i18nKey: "section.story.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "section.story.title", labelKey: "admin.content.field.titleShort", multiline: true },
      { i18nKey: "section.story.body", labelKey: "admin.content.field.body", multiline: true },
      { i18nKey: "section.story.stat.years", labelKey: "admin.content.field.statYears" },
      { i18nKey: "section.story.stat.countries", labelKey: "admin.content.field.statCountries" },
      { i18nKey: "section.story.stat.colours", labelKey: "admin.content.field.statColours" },
    ],
  },
  {
    key: "dealer",
    labelKey: "admin.content.block.dealer",
    fields: [
      { i18nKey: "section.dealer.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "section.dealer.title", labelKey: "admin.content.field.titlePlain" },
      { i18nKey: "section.dealer.body", labelKey: "admin.content.field.body", multiline: true },
      { i18nKey: "section.dealer.cta", labelKey: "admin.content.field.cta" },
      { i18nKey: "section.dealer.address", labelKey: "admin.content.field.address" },
    ],
  },
  {
    key: "benefits",
    labelKey: "admin.content.block.benefits",
    fields: [
      { i18nKey: "section.benefits.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "section.benefits.title", labelKey: "admin.content.field.titleShort", multiline: true },
      { i18nKey: "section.benefits.1.t", labelKey: "admin.content.field.benefitTitle", labelVars: { n: 1 } },
      { i18nKey: "section.benefits.1.d", labelKey: "admin.content.field.benefitDesc", labelVars: { n: 1 }, multiline: true },
      { i18nKey: "section.benefits.2.t", labelKey: "admin.content.field.benefitTitle", labelVars: { n: 2 } },
      { i18nKey: "section.benefits.2.d", labelKey: "admin.content.field.benefitDesc", labelVars: { n: 2 }, multiline: true },
      { i18nKey: "section.benefits.3.t", labelKey: "admin.content.field.benefitTitle", labelVars: { n: 3 } },
      { i18nKey: "section.benefits.3.d", labelKey: "admin.content.field.benefitDesc", labelVars: { n: 3 }, multiline: true },
      { i18nKey: "section.benefits.4.t", labelKey: "admin.content.field.benefitTitle", labelVars: { n: 4 } },
      { i18nKey: "section.benefits.4.d", labelKey: "admin.content.field.benefitDesc", labelVars: { n: 4 }, multiline: true },
    ],
  },
  {
    key: "categories",
    labelKey: "admin.content.block.categories",
    fields: [
      { i18nKey: "section.categories.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "section.categories.title", labelKey: "admin.content.field.titleShort", multiline: true },
      { i18nKey: "section.categories.small", labelKey: "admin.content.categories.smallLabel" },
      { i18nKey: "section.categories.refrigerators", labelKey: "admin.content.categories.refrigerators" },
      { i18nKey: "section.categories.ovens", labelKey: "admin.content.categories.ovens" },
      { i18nKey: "section.categories.hobs", labelKey: "admin.content.categories.hobs" },
    ],
  },
  {
    key: "homepage",
    labelKey: "admin.content.block.homepage",
    fields: [
      { i18nKey: "section.featured.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "section.featured.title", labelKey: "admin.content.field.titleShort", multiline: true },
    ],
  },
  {
    key: "marquee",
    labelKey: "admin.content.block.marquee",
    fields: [
      {
        i18nKey: "marquee.text",
        labelKey: "admin.content.field.marquee",
        multiline: true,
      },
    ],
  },
  {
    key: "footer",
    labelKey: "admin.content.block.footer",
    fields: [
      { i18nKey: "footer.tagline", labelKey: "admin.content.field.desc", multiline: true },
      { i18nKey: "footer.address.line1", labelKey: "admin.content.field.address1" },
      { i18nKey: "footer.address.line2", labelKey: "admin.content.field.address2" },
    ],
  },
];

const LANGS: { code: Lang; labelKey: string }[] = [
  { code: "ru", labelKey: "admin.content.langRu" },
  { code: "en", labelKey: "admin.content.langEn" },
  { code: "hy", labelKey: "admin.content.langHy" },
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function ContentPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const defaults = getI18nDefaults();
  const q = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) throw error;
      const map: Record<string, BlockValue> = {};
      let styles: ContentStylesMap = {};
      (data ?? []).forEach((r) => {
        if (r.key === "__styles__") styles = (r.value as ContentStylesMap) ?? {};
        else map[r.key] = (r.value as BlockValue) ?? {};
      });
      return { map, styles };
    },
  });

  const [state, setState] = useState<Record<string, BlockValue>>({});
  const [styles, setStyles] = useState<ContentStylesMap>({});
  const [openStyles, setOpenStyles] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (q.data) {
      setState(q.data.map);
      setStyles(q.data.styles);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async ({ key, value, styles: nextStyles }: { key: string; value: BlockValue; styles: ContentStylesMap }) => {
      const { error: e1 } = await supabase
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("site_content")
        .upsert({ key: "__styles__", value: nextStyles }, { onConflict: "key" });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(t("admin.content.savedRefresh"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const updateField = (block: string, i18nKey: string, lang: Lang, value: string) => {
    setState((prev) => {
      const next = { ...prev };
      const blockVal = { ...(next[block] ?? {}) };
      const fieldVal = { ...(blockVal[i18nKey] ?? {}) };
      fieldVal[lang] = value;
      blockVal[i18nKey] = fieldVal;
      next[block] = blockVal;
      return next;
    });
  };

  const updateStyle = (i18nKey: string, patch: Partial<ContentStyle>) => {
    setStyles((prev) => {
      const cur = { ...(prev[i18nKey] ?? {}) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || v == null) delete (cur as Record<string, unknown>)[k];
        else (cur as Record<string, unknown>)[k] = v;
      }
      const next = { ...prev };
      if (Object.keys(cur).length === 0) delete next[i18nKey];
      else next[i18nKey] = cur;
      return next;
    });
  };

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("admin.content.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.content.desc")}</p>

      <div className="mt-10 space-y-8">
        {BLOCKS.map((b) => {
          const v = state[b.key] ?? {};
          return (
            <div key={b.key} className="rounded-sm border border-border p-6">
              <h2 className="font-serif text-2xl">{t(b.labelKey)}</h2>
              <div className="mt-4 space-y-6">
                {b.fields.map((f) => (
                  <div key={f.i18nKey} className="rounded-sm bg-secondary/40 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{t(f.labelKey, f.labelVars)}</span>
                      <code className="text-[10px] text-muted-foreground">{f.i18nKey}</code>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      {LANGS.map((l) => {
                        const placeholder = defaults[l.code][f.i18nKey] ?? "";
                        const fieldVal = v[f.i18nKey]?.[l.code] ?? "";
                        return (
                          <label key={l.code} className="block">
                            <span className="eyebrow mb-1 block text-muted-foreground">{t(l.labelKey)}</span>
                            <textarea
                              rows={f.multiline ? 3 : 2}
                              value={fieldVal}
                              maxLength={2000}
                              placeholder={placeholder}
                              onChange={(e) => updateField(b.key, f.i18nKey, l.code, e.target.value)}
                              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <StyleEditor
                      i18nKey={f.i18nKey}
                      value={styles[f.i18nKey] ?? {}}
                      open={!!openStyles[f.i18nKey]}
                      onToggle={() => setOpenStyles((p) => ({ ...p, [f.i18nKey]: !p[f.i18nKey] }))}
                      onChange={(patch) => updateStyle(f.i18nKey, patch)}
                    />
                  </div>
                ))}
                {b.key === "categories" && (
                  <CategoriesContentEditor
                    value={v}
                    onChange={(next) => setState((prev) => ({ ...prev, [b.key]: next }))}
                  />
                )}
                {b.key === "homepage" && (
                  <HomepageProductsEditor
                    value={v}
                    onChange={(next) => setState((prev) => ({ ...prev, [b.key]: next }))}
                  />
                )}
              </div>
              <button
                onClick={() => save.mutate({ key: b.key, value: v, styles })}
                className="mt-4 rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
              >
                {t("admin.content.saveBlock")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StyleEditor({
  i18nKey,
  value,
  open,
  onToggle,
  onChange,
}: {
  i18nKey: string;
  value: ContentStyle;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ContentStyle>) => void;
}) {
  const { t } = useI18n();
  const styled = Object.keys(value).length > 0;
  return (
    <div className="mt-4 rounded-sm border border-border bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
      >
        <span>{t("admin.content.styleTitle")} {styled && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-accent" />}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-border p-3 md:grid-cols-3">
          <Field label={t("admin.content.styleFont")}>
            <select
              value={value.fontFamily ?? ""}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>{f.label}</option>
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
          <Field label={t("admin.content.styleWeight")}>
            <select
              value={value.fontWeight ?? ""}
              onChange={(e) => onChange({ fontWeight: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">auto</option>
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={String(w)}>{w}</option>
              ))}
            </select>
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
          <Field label={t("admin.content.styleLetterSpacing")}>
            <input
              value={value.letterSpacing ?? ""}
              onChange={(e) => onChange({ letterSpacing: e.target.value })}
              placeholder={t("admin.content.styleLetterEx")}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("admin.content.styleLineHeight")}>
            <input
              value={value.lineHeight ?? ""}
              onChange={(e) => onChange({ lineHeight: e.target.value })}
              placeholder={t("admin.content.styleLineEx")}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("admin.content.styleCase")}>
            <select
              value={value.textTransform ?? ""}
              onChange={(e) => onChange({ textTransform: (e.target.value || undefined) as ContentStyle["textTransform"] })}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">auto</option>
              <option value="none">{t("admin.content.styleNormal")}</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </Field>
          <Field label={t("admin.content.styleStyle")}>
            <select
              value={value.fontStyle ?? ""}
              onChange={(e) => onChange({ fontStyle: (e.target.value || undefined) as ContentStyle["fontStyle"] })}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">auto</option>
              <option value="normal">normal</option>
              <option value="italic">italic</option>
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onChange({ fontFamily: "", fontSize: "", fontWeight: "", color: "", letterSpacing: "", lineHeight: "", textTransform: undefined, fontStyle: undefined })}
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              {t("admin.content.resetStyle")}
            </button>
          </div>
          <p className="md:col-span-3 text-[10px] text-muted-foreground">
            {t("admin.content.styleNote", { key: i18nKey })}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}