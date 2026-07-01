import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n, type Lang } from "@/lib/i18n";
import type { ContentStylesMap } from "@/lib/content-styles";
import { ContentBlockEditor, type ContentBlock } from "@/components/admin/ContentBlockEditor";
import { HouseOfCoffeeEditor } from "@/components/admin/HouseOfCoffeeEditor";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { invalidateSiteContentQueries } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/admini/content")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: ContentPage,
});

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
      { i18nKey: "section.story.stat.years.value", labelKey: "admin.content.field.statYearsValue" },
      { i18nKey: "section.story.stat.countries", labelKey: "admin.content.field.statCountries" },
      { i18nKey: "section.story.stat.countries.value", labelKey: "admin.content.field.statCountriesValue" },
      { i18nKey: "section.story.stat.colours", labelKey: "admin.content.field.statColours" },
      { i18nKey: "section.story.stat.colours.value", labelKey: "admin.content.field.statColoursValue" },
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

type SectionId = ContentBlock["key"] | "house-of-coffee";

const SECTIONS: { id: SectionId; labelKey: string; group: "site" | "contacts" | "hoc" }[] = [
  ...HOMEPAGE_BLOCKS.map((b) => ({ id: b.key as SectionId, labelKey: b.labelKey, group: "site" as const })),
  ...CONTACT_BLOCKS.map((b) => ({ id: b.key as SectionId, labelKey: b.labelKey, group: "contacts" as const })),
  { id: "house-of-coffee", labelKey: "admin.content.tab.hoc", group: "hoc" },
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function ContentPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [section, setSection] = useState<SectionId>("hero");
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
  const draftDirtyRef = useRef(false);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!q.data || draftDirtyRef.current || hydratedRef.current) return;
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
      draftDirtyRef.current = false;
      invalidateSiteContentQueries(qc);
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const updateField = (block: string, i18nKey: string, lang: Lang, value: string) => {
    draftDirtyRef.current = true;
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

  const persistBlock = async (key: string, value: BlockValue) => {
    draftDirtyRef.current = true;
    setState((prev) => ({ ...prev, [key]: value }));
    await save.mutateAsync({ key, value, styles });
  };

  const activeBlock =
    section === "house-of-coffee"
      ? null
      : [...HOMEPAGE_BLOCKS, ...CONTACT_BLOCKS].find((b) => b.key === section) ?? HOMEPAGE_BLOCKS[0];
  const hocValue = state["house-of-coffee"] ?? {};

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl">{t("admin.content.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.content.simpleDesc")}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("admin.content.categories.menuHint")}{" "}
        <Link to="/admini/menu" className="underline hover:text-foreground">
          {t("admin.nav.menuGroups")}
        </Link>
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="space-y-4">
          <div>
            <p className="mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("admin.content.group.site")}</p>
            <ul className="space-y-0.5">
              {SECTIONS.filter((s) => s.group === "site").map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${
                      section === s.id ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary"
                    }`}
                  >
                    {t(s.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("admin.content.group.contacts")}</p>
            <ul className="space-y-0.5">
              {SECTIONS.filter((s) => s.group === "contacts").map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${
                      section === s.id ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary"
                    }`}
                  >
                    {t(s.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("admin.content.tab.hoc")}</p>
            <button
              type="button"
              onClick={() => setSection("house-of-coffee")}
              className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${
                section === "house-of-coffee" ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              {t("admin.content.tab.hoc")}
            </button>
          </div>
        </nav>

        <div>
          {section === "house-of-coffee" ? (
            <>
              <HouseOfCoffeeEditor
                value={hocValue}
                onChange={(next) => {
                  draftDirtyRef.current = true;
                  setState((prev) => ({ ...prev, "house-of-coffee": next }));
                }}
                onPersist={async (next) => {
                  setState((prev) => ({ ...prev, "house-of-coffee": next }));
                  await save.mutateAsync({ key: "house-of-coffee", value: next, styles });
                }}
              />
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate({ key: "house-of-coffee", value: hocValue, styles })}
                className="mt-6 w-full rounded-sm bg-foreground py-3 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {save.isPending ? t("admin.loading") : t("admin.save")}
              </button>
            </>
          ) : activeBlock ? (
            <>
              <ContentBlockEditor
                block={activeBlock}
                value={state[activeBlock.key] ?? {}}
                styles={styles}
                simple
                onFieldChange={(i18nKey, lang, value) => updateField(activeBlock.key, i18nKey, lang, value)}
                onStyleChange={() => {}}
                onValueReplace={(next) => {
                  draftDirtyRef.current = true;
                  setState((prev) => ({ ...prev, [activeBlock.key]: next }));
                }}
                onPersist={(next) => persistBlock(activeBlock.key, next)}
              />
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => void persistBlock(activeBlock.key, state[activeBlock.key] ?? {})}
                className="mt-6 w-full rounded-sm bg-foreground py-3 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {save.isPending ? t("admin.loading") : t("admin.save")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
