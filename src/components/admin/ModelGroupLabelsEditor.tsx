import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, type Lang } from "@/lib/i18n";
import { fetchAdminModelGroups } from "@/lib/products";
import {
  labelForModelGroup,
  labelsWithContent,
  parseModelGroupLabels,
  serializeModelGroupLabels,
  skuModelPrefix,
  upsertModelGroupLabel,
  type ModelGroupLabel,
} from "@/lib/model-group-labels";
import { GroupLabelImageFields } from "@/components/admin/GroupLabelImageFields";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

export function ModelGroupLabelsEditor({
  value,
  onChange,
  onPersist,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
  onPersist?: (next: BlockValue) => Promise<void>;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");
  const stored = parseModelGroupLabels(value);

  const groupsQuery = useQuery({
    queryKey: ["admin-model-groups"],
    queryFn: fetchAdminModelGroups,
    staleTime: 60_000,
  });

  const buildNextValue = (labels: ModelGroupLabel[]): BlockValue => {
    const cleaned = labelsWithContent(labels);
    return {
      ...value,
      "config.modelGroupLabels": {
        ru: serializeModelGroupLabels(cleaned),
        en: serializeModelGroupLabels(cleaned),
        hy: serializeModelGroupLabels(cleaned),
      },
    };
  };

  const persist = (labels: ModelGroupLabel[]) => {
    onChange(buildNextValue(labels));
  };

  const persistAndSave = async (labels: ModelGroupLabel[]) => {
    const next = buildNextValue(labels);
    onChange(next);
    if (onPersist) await onPersist(next);
  };

  const updateGroup = (modelGroup: string, patch: Partial<Omit<ModelGroupLabel, "key">>) => {
    persist(upsertModelGroupLabel(stored, modelGroup, patch));
  };

  const updateGroupAndSave = async (modelGroup: string, patch: Partial<Omit<ModelGroupLabel, "key">>) => {
    await persistAndSave(upsertModelGroupLabel(stored, modelGroup, patch));
  };

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = groupsQuery.data ?? [];
    if (!q) return list;
    return list.filter(
      (g) =>
        g.model_group.toLowerCase().includes(q) ||
        g.sample_sku.toLowerCase().includes(q) ||
        g.sample_name.toLowerCase().includes(q) ||
        (g.family ?? "").toLowerCase().includes(q),
    );
  }, [groupsQuery.data, filter]);

  return (
    <div className="rounded-sm border border-dashed border-border bg-secondary/20 p-4">
      <h3 className="text-sm font-medium">{t("admin.content.categories.modelGroupsTitle")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.categories.modelGroupsDesc")}</p>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t("admin.content.categories.modelGroupSearch")}
        className="mt-4 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
      />

      {groupsQuery.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("admin.loading")}</p>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("admin.content.categories.modelGroupEmpty")}</p>
      ) : (
        <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
          {groups.map((g) => {
            const row =
              labelForModelGroup(stored, g.model_group) ??
              labelForModelGroup(stored, skuModelPrefix(g.sample_sku) ?? "") ??
              ({ key: g.model_group } satisfies ModelGroupLabel);
            const prefix = skuModelPrefix(g.sample_sku);
            return (
              <div key={g.model_group} className="rounded-sm border border-border bg-background p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{g.sample_name}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {g.product_count} {t("admin.content.categories.modelGroupVariants")}
                    {g.family ? ` · ${g.family}` : ""}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {prefix ? `${prefix} · ` : ""}
                  {g.model_group}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(["ru", "en", "hy"] as Lang[]).map((lang) => (
                    <label key={lang} className="block">
                      <span className="text-xs text-muted-foreground">
                        {lang === "ru" ? "Название RU" : lang === "en" ? "Name EN" : "Անվանում HY"}
                      </span>
                      <input
                        value={(row[`name_${lang}` as keyof ModelGroupLabel] as string | undefined) ?? ""}
                        onChange={(e) =>
                          updateGroup(g.model_group, { [`name_${lang}`]: e.target.value } as Partial<ModelGroupLabel>)
                        }
                        placeholder={g.sample_name}
                        className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                    </label>
                  ))}
                </div>
                <GroupLabelImageFields
                  groupKey={g.model_group}
                  image={row.image ?? ""}
                  imageSku={row.image_sku ?? ""}
                  sampleSku={g.sample_sku}
                  onChange={(patch) => updateGroup(g.model_group, patch)}
                  onUploadSave={(patch) => updateGroupAndSave(g.model_group, patch)}
                />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">{t("admin.content.categories.modelGroupSaveHint")}</p>
    </div>
  );
}
