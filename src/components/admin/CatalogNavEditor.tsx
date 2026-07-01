import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { fetchCategories } from "@/lib/products";
import {
  type CatalogNavGroupDef,
  type NavGroupMember,
  navGroupLabel,
  parseCatalogNavGroups,
  serializeCatalogNavGroups,
} from "@/lib/catalog-nav-groups";
import { DEFAULT_CATALOG_NAV_GROUPS } from "@/lib/catalog-nav-defaults";
import type { CatalogSection } from "@/lib/catalog-sections";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

const SECTIONS: CatalogSection[] = ["large", "small", "accessories"];

const MEMBER_TYPES: NavGroupMember["type"][] = ["category", "family", "model_group", "sku"];

export function CatalogNavEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { t, lang } = useI18n();
  const cats = useQuery({ queryKey: ["admin-catalog-categories"], queryFn: fetchCategories });
  const groups = parseCatalogNavGroups(value);
  const effective = groups.length ? groups : DEFAULT_CATALOG_NAV_GROUPS;

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
        labels: { ru: "Новая группа", en: "New group", hy: "Նոր խումբ" },
        members: [],
      },
    ]);
  };

  const removeGroup = (index: number) => {
    persist(effective.filter((_, i) => i !== index));
  };

  const updateMember = (gi: number, mi: number, patch: Partial<NavGroupMember>) => {
    const next = [...effective];
    const members = [...next[gi].members];
    members[mi] = { ...members[mi], ...patch } as NavGroupMember;
    next[gi] = { ...next[gi], members };
    persist(next);
  };

  const addMember = (gi: number, type: NavGroupMember["type"]) => {
    const next = [...effective];
    const base: NavGroupMember =
      type === "category"
        ? { type, slug: cats.data?.[0]?.slug ?? "kettles" }
        : type === "family"
          ? { type, name: "Kettles" }
          : type === "model_group"
            ? { type, key: "HBAC11" }
            : { type, sku: "" };
    next[gi] = { ...next[gi], members: [...next[gi].members, base] };
    persist(next);
  };

  const removeMember = (gi: number, mi: number) => {
    const next = [...effective];
    next[gi] = { ...next[gi], members: next[gi].members.filter((_, i) => i !== mi) };
    persist(next);
  };

  const loadDefaults = () => persist(DEFAULT_CATALOG_NAV_GROUPS);

  return (
    <div className="rounded-sm border border-dashed border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{t("admin.content.nav.title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.nav.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDefaults}
            className="rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-wider hover:border-foreground"
          >
            {t("admin.content.nav.loadDefaults")}
          </button>
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

      <div className="mt-6 space-y-4">
        {effective.map((group, gi) => (
          <div key={group.id} className="rounded-sm border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{navGroupLabel(group, lang)}</p>
              <button type="button" onClick={() => removeGroup(gi)} className="text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">ID</span>
                <input
                  value={group.id}
                  onChange={(e) => updateGroup(gi, { id: e.target.value.trim() })}
                  className="mt-1 w-full rounded-sm border border-border px-2 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">{t("admin.content.nav.section")}</span>
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
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {(["ru", "en", "hy"] as Lang[]).map((l) => (
                <label key={l} className="block">
                  <span className="text-xs text-muted-foreground">{l.toUpperCase()}</span>
                  <input
                    value={group.labels[l] ?? ""}
                    onChange={(e) =>
                      updateGroup(gi, { labels: { ...group.labels, [l]: e.target.value } })
                    }
                    className="mt-1 w-full rounded-sm border border-border px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("admin.content.nav.members")}
              </p>
              <ul className="mt-2 space-y-2">
                {group.members.map((m, mi) => (
                  <li key={mi} className="flex flex-wrap items-center gap-2 rounded-sm border border-border p-2">
                    <select
                      value={m.type}
                      onChange={(e) => {
                        const type = e.target.value as NavGroupMember["type"];
                        const replacement: NavGroupMember =
                          type === "category"
                            ? { type, slug: cats.data?.[0]?.slug ?? "kettles" }
                            : type === "family"
                              ? { type, name: "" }
                              : type === "model_group"
                                ? { type, key: "" }
                                : { type, sku: "" };
                        updateMember(gi, mi, replacement);
                      }}
                      className="rounded-sm border border-border px-2 py-1 text-xs"
                    >
                      {MEMBER_TYPES.map((tp) => (
                        <option key={tp} value={tp}>
                          {t(`admin.content.nav.member.${tp}`)}
                        </option>
                      ))}
                    </select>
                    {m.type === "category" && (
                      <select
                        value={m.slug}
                        onChange={(e) => updateMember(gi, mi, { type: "category", slug: e.target.value })}
                        className="min-w-[10rem] flex-1 rounded-sm border border-border px-2 py-1 text-sm"
                      >
                        {(cats.data ?? []).map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.category_en ?? c.category} ({c.count})
                          </option>
                        ))}
                      </select>
                    )}
                    {m.type === "family" && (
                      <input
                        value={m.name}
                        onChange={(e) => updateMember(gi, mi, { type: "family", name: e.target.value })}
                        placeholder="Kettles"
                        className="min-w-[10rem] flex-1 rounded-sm border border-border px-2 py-1 text-sm"
                      />
                    )}
                    {m.type === "model_group" && (
                      <input
                        value={m.key}
                        onChange={(e) => updateMember(gi, mi, { type: "model_group", key: e.target.value })}
                        placeholder="HBAC11"
                        className="min-w-[10rem] flex-1 rounded-sm border border-border px-2 py-1 font-mono text-sm"
                      />
                    )}
                    {m.type === "sku" && (
                      <input
                        value={m.sku}
                        onChange={(e) =>
                          updateMember(gi, mi, { type: "sku", sku: e.target.value.toUpperCase() })
                        }
                        placeholder="SKU"
                        className="min-w-[10rem] flex-1 rounded-sm border border-border px-2 py-1 font-mono text-sm"
                      />
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
        ))}
      </div>
    </div>
  );
}
