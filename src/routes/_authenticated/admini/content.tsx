import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n, type Lang } from "@/lib/i18n";
import type { ContentStylesMap } from "@/lib/content-styles";
import { ContentBlockEditor, type ContentBlock } from "@/components/admin/ContentBlockEditor";
import { HouseOfCoffeeEditor } from "@/components/admin/HouseOfCoffeeEditor";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { siteContentQueryKey } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/admini/content")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: ContentPage,
});

type TabId = "homepage" | "house-of-coffee" | "contacts";

const TABS: { id: TabId; labelKey: string }[] = [
  { id: "homepage", labelKey: "admin.content.tab.homepage" },
  { id: "house-of-coffee", labelKey: "admin.content.tab.hoc" },
  { id: "contacts", labelKey: "admin.content.tab.contacts" },
];

const HOMEPAGE_BLOCKS: ContentBlock[] = [
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
    fields: [{ i18nKey: "marquee.text", labelKey: "admin.content.field.marquee", multiline: true }],
  },
];

const CONTACT_BLOCKS: ContentBlock[] = [
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
    key: "footer",
    labelKey: "admin.content.block.footer",
    fields: [
      { i18nKey: "footer.tagline", labelKey: "admin.content.field.desc", multiline: true },
      { i18nKey: "footer.address.line1", labelKey: "admin.content.field.address1" },
      { i18nKey: "footer.address.line2", labelKey: "admin.content.field.address2" },
    ],
  },
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function ContentPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("homepage");
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
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!q.data || hydratedRef.current) return;
    setState(q.data.map);
    setStyles(q.data.styles);
    hydratedRef.current = true;
  }, [q.data]);

  const save = useMutation({
    mutationFn: async ({ key, value, styles: nextStyles }: { key: string; value: BlockValue; styles: ContentStylesMap }) => {
      const { data: row1, error: e1 } = await supabase
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" })
        .select("key")
        .maybeSingle();
      if (e1) throw e1;
      assertRowUpdated(row1, t("admin.writeNoRow"));
      const { data: row2, error: e2 } = await supabase
        .from("site_content")
        .upsert({ key: "__styles__", value: nextStyles }, { onConflict: "key" })
        .select("key")
        .maybeSingle();
      if (e2) throw e2;
      assertRowUpdated(row2, t("admin.writeNoRow"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: siteContentQueryKey });
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

  const updateStyle = (i18nKey: string, patch: Partial<import("@/lib/content-styles").ContentStyle>) => {
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

  const activeBlocks = tab === "homepage" ? HOMEPAGE_BLOCKS : tab === "contacts" ? CONTACT_BLOCKS : [];
  const hocValue = state["house-of-coffee"] ?? {};

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("admin.content.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.content.desc")}</p>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.16em] transition ${
              tab === item.id ? "bg-foreground text-background" : "bg-secondary text-foreground/70 hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {tab === "house-of-coffee" && (
          <>
            <HouseOfCoffeeEditor
              value={hocValue}
              onChange={(next) => setState((prev) => ({ ...prev, "house-of-coffee": next }))}
              onPersist={async (next) => {
                setState((prev) => ({ ...prev, "house-of-coffee": next }));
                await save.mutateAsync({ key: "house-of-coffee", value: next, styles });
              }}
            />
            <button
              onClick={() => save.mutate({ key: "house-of-coffee", value: hocValue, styles })}
              className="rounded-sm bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
            >
              {t("admin.hoc.save")}
            </button>
          </>
        )}

        {activeBlocks.map((b) => {
          const v = state[b.key] ?? {};
          return (
            <div key={b.key}>
              <ContentBlockEditor
                block={b}
                value={v}
                styles={styles}
                onFieldChange={(i18nKey, lang, value) => updateField(b.key, i18nKey, lang, value)}
                onStyleChange={updateStyle}
                onValueReplace={(next) => setState((prev) => ({ ...prev, [b.key]: next }))}
              />
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
