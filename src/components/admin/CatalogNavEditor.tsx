import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { fetchCategories, fetchFacets, fetchSkusForNavGroup } from "@/lib/products";
import {
  type CatalogNavGroupDef,
  type NavGroupMember,
  navGroupLabel,
  parseCatalogNavGroups,
  resolveNavGroupFilters,
  serializeCatalogNavGroups,
} from "@/lib/catalog-nav-groups";
import { DEFAULT_CATALOG_NAV_GROUPS } from "@/lib/catalog-nav-defaults";
import type { CatalogSection } from "@/lib/catalog-sections";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

const SECTIONS: CatalogSection[] = ["large", "small", "accessories"];

const MEMBER_TYPES: NavGroupMember["type"][] = ["category", "family"];

function GroupCount({ group, categories }: { group: CatalogNavGroupDef; categories: import("@/lib/products").CategoryStat[] }) {
  const { t } = useI18n();
  const filters = useMemo(() => resolveNavGroupFilters(group.id, [group], categories), [group, categories]);
  const countQ = useQuery({
    queryKey: ["nav-group-count", group.id, group.members],
    queryFn: async () => {
      if (!filters) return 0;
      const skus = await fetchSkusForNavGroup(filters);
      return skus.length;
    },
    enabled: !!filters && group.members.length > 0,
    staleTime: 60_000,
  });
  if (!group.members.length) return null;
  return (
    <span className="text-xs text-muted-foreground">
      {countQ.isLoading ? "…" : t("admin.menu.productCount", { n: countQ.data ?? 0 })}
    </span>
  );
}

export function CatalogNavEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { t, lang } = useI18n();
  const cats = useQuery({ queryKey: ["admin-catalog-categories"], queryFn: fetchCategories });
  const facets = useQuery({ queryKey: ["admin-facets"], queryFn: fetchFacets, staleTime: 5 * 60_000 });
  const groups = parseCatalogNavGroups(value);
  const effective = groups.length ? groups : DEFAULT_CATALOG_NAV_GROUPS;
  const familyOptions = facets.data?.families.map((f) => f.value).sort() ?? [];

  const persist = (next: CatalogNavGroupDef[]) => {
    const json = serializeCatalogNavGroups(next);
    onChange({
      ...value,
      "config.groups": { ru: json, en: json, hy: json },
    });
  };

  const updateGroup = (index: number, patch: Partial<CatalogNavGroupDef>) => {
    const next = [...effective];
    next[index] = { ...next[index], ...patch };
    persist(next);
  };

  const addGroup = () => {
    persist([
      ...effective,
      {
        id: `group-${Date.now()}`,
        section: "small",
        labels: { ru: "Новая подборка", en: "New collection", hy: "Նոր խումբ" },
        members: [],
      },
    ]);
  };

  const removeGroup = (index: number) => {
    persist(effective.filter((_, i) => i !== index));
  };

  const updateMember = (gi: number, mi: number, member: NavGroupMember) => {
    const next = [...effective];
    const members = [...next[gi].members];
    members[mi] = member;
    next[gi] = { ...next[gi], members };
    persist(next);
  };

  const addMember = (gi: number, type: NavGroupMember["type"]) => {
    const next = [...effective];
    const base: NavGroupMember =
      type === "category"
        ? { type, slug: cats.data?.[0]?.slug ?? "kettles" }
        : { type, name: familyOptions[0] ?? "Kettles" };
    next[gi] = { ...next[gi], members: [...next[gi].members, base] };
    persist(next);
  };

  const removeMember = (gi: number, mi: number) => {
    const next = [...effective];
    next[gi] = { ...next[gi], members: next[gi].members.filter((_, i) => i !== mi) };
    persist(next);
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{t("admin.content.nav.title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.nav.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addGroup}
            className="inline-flex items-center gap-1 rounded-sm bg-foreground px-3 py-1.5 text-xs uppercase tracking-wider text-background"
          >
            <Plus className="h-3 w-3" />
            {t("admin.content.nav.addGroup")}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {effective.map((group, gi) => (
          <details key={group.id} open className="overflow-hidden rounded-xl border border-border bg-background">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="font-medium">{navGroupLabel(group, lang)}</p>
                <p className="text-[10px] text-muted-foreground">{group.id}</p>
              </div>
              <div className="flex items-center gap-3">
                {cats.data && <GroupCount group={group} categories={cats.data} />}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeGroup(gi);
                  }}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </summary>
            <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {(["ru", "en", "hy"] as Lang[]).map((l) => (
                  <label key={l} className="block">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</span>
                    <input
                      value={group.labels[l] ?? ""}
                      onChange={(e) => updateGroup(gi, { labels: { ...group.labels, [l]: e.target.value } })}
                      className="mt-1 w-full rounded-sm border border-border px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <label className="block sm:max-w-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("admin.content.nav.section")}</span>
                <select
                  value={group.section}
                  onChange={(e) => updateGroup(gi, { section: e.target.value as CatalogSection })}
                  className="mt-1 w-full rounded-sm border border-border px-2 py-1.5 text-sm"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {t(`catalog.section.${s}`)}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("admin.content.nav.members")}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.members.map((m, mi) => (
                    <li key={mi} className="flex flex-wrap items-center gap-2 rounded-sm border border-border p-2">
                      <select
                        value={m.type}
                        onChange={(e) => {
                          const type = e.target.value as NavGroupMember["type"];
                          updateMember(
                            gi,
                            mi,
                            type === "category"
                              ? { type, slug: cats.data?.[0]?.slug ?? "kettles" }
                              : { type, name: familyOptions[0] ?? "Kettles" },
                          );
                        }}
                        className="rounded-sm border border-border px-2 py-1 text-xs"
                      >
                        {MEMBER_TYPES.map((tp) => (
                          <option key={tp} value={tp}>
                            {t(`admin.content.nav.member.${tp}`)}
                          </option>
                        ))}
                      </select>
                      {m.type === "category" ? (
                        <select
                          value={m.slug}
                          onChange={(e) => updateMember(gi, mi, { type: "category", slug: e.target.value })}
                          className="min-w-[12rem] flex-1 rounded-sm border border-border px-2 py-1 text-sm"
                        >
                          {(cats.data ?? []).map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.category_ru ?? c.category_en ?? c.category} ({c.count})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={m.name}
                          onChange={(e) => updateMember(gi, mi, { type: "family", name: e.target.value })}
                          className="min-w-[12rem] flex-1 rounded-sm border border-border px-2 py-1 text-sm"
                        >
                          {familyOptions.map((fam) => (
                            <option key={fam} value={fam}>
                              {fam}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={() => removeMember(gi, mi)} className="text-muted-foreground hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MEMBER_TYPES.map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => addMember(gi, tp)}
                      className="rounded-sm border border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-wider"
                    >
                      + {t(`admin.content.nav.member.${tp}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
