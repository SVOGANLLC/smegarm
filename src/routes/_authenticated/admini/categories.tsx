import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { fetchCategories, type CategoryStat } from "@/lib/products";
import { CATEGORY_LABELS, categoryLabel } from "@/lib/category-i18n";
import { renameCategoryLabels } from "@/lib/category-rename.functions";
import { invalidateSiteContentQueries } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/admini/categories")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin" && role !== "manager") throw redirect({ to: "/admini" });
  },
  component: AdminCategoriesPage,
});

type Draft = { ru: string; en: string; hy: string };

function seedDraft(cat: CategoryStat): Draft {
  const fallback = CATEGORY_LABELS[cat.category];
  return {
    ru: (cat.category_ru || fallback?.ru || cat.category).trim(),
    en: (cat.category_en || fallback?.en || cat.category).trim(),
    hy: (cat.category_hy || fallback?.hy || "").trim(),
  };
}

function draftsEqual(a: Draft, b: Draft) {
  return a.ru.trim() === b.ru.trim() && a.en.trim() === b.en.trim() && a.hy.trim() === b.hy.trim();
}

function AdminCategoriesPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const renameFn = useServerFn(renameCategoryLabels);
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const catsQ = useQuery({
    queryKey: ["admin-catalog-categories"],
    queryFn: fetchCategories,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!catsQ.data) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const cat of catsQ.data) {
        if (!next[cat.category]) next[cat.category] = seedDraft(cat);
      }
      return next;
    });
  }, [catsQ.data]);

  const filtered = useMemo(() => {
    const list = catsQ.data ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const d = drafts[c.category] ?? seedDraft(c);
      return [c.category, c.slug, d.ru, d.en, d.hy, ...(c.raw ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [catsQ.data, filter, drafts]);

  const save = useMutation({
    mutationFn: async ({ cat, draft }: { cat: CategoryStat; draft: Draft }) => {
      const ru = draft.ru.trim();
      const en = draft.en.trim();
      const hy = draft.hy.trim();
      if (!ru || !en || !hy) throw new Error(t("admin.categories.allRequired"));
      return renameFn({
        data: {
          matchCanonical: cat.category,
          matchRaw: cat.raw?.length ? cat.raw : [cat.category],
          matchEn: cat.category_en ?? null,
          labels: { ru, en, hy },
        },
      });
    },
    onMutate: ({ cat }) => setSavingKey(cat.category),
    onSuccess: async (res, { draft }) => {
      toast.success(
        t("admin.categories.saved", {
          n: res.updated,
          name: draft.ru || draft.en,
        }),
      );
      setDrafts({});
      await qc.invalidateQueries({ queryKey: ["admin-catalog-categories"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      if (res.contentRemapped) invalidateSiteContentQueries(qc);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
    onSettled: () => setSavingKey(null),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl">{t("admin.categories.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.categories.intro")}</p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("admin.categories.search")}
          className="w-full rounded-sm border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-foreground"
        />
      </div>

      {catsQ.isLoading ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((cat) => {
            const seed = seedDraft(cat);
            const draft = drafts[cat.category] ?? seed;
            const dirty = !draftsEqual(draft, seed);
            const busy = savingKey === cat.category;
            const label = categoryLabel(cat.category, lang, {
              hy: cat.category_hy,
              en: cat.category_en,
              ru: cat.category_ru,
            });

            return (
              <li key={cat.category} className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {cat.slug} · {t("admin.categories.productCount", { n: cat.count })}
                    </p>
                  </div>
                  {dirty && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("admin.categories.unsaved")}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(["ru", "en", "hy"] as const).map((code) => (
                    <label key={code} className="block">
                      <span className="text-xs text-muted-foreground">
                        {t(`admin.categories.lang.${code}`)}
                      </span>
                      <input
                        value={draft[code]}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [cat.category]: { ...draft, [code]: e.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={!dirty || busy || save.isPending}
                    onClick={() => save.mutate({ cat, draft })}
                    className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("admin.categories.apply", { n: cat.count })}
                  </button>
                </div>
              </li>
            );
          })}
          {!filtered.length && (
            <li className="py-10 text-center text-sm text-muted-foreground">{t("admin.categories.empty")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
