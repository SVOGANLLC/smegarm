import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, type Lang } from "@/lib/i18n";
import { fetchAdminModelGroups } from "@/lib/products";
import {
  labelForModelGroup,
  labelsWithContent,
  parseModelGroupLabels,
  resolveModelGroupImage,
  serializeModelGroupLabels,
  skuModelPrefix,
  upsertModelGroupLabel,
  type ModelGroupLabel,
} from "@/lib/model-group-labels";
import { uploadAdminImage } from "@/lib/admin-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function GroupCardImageFields({
  row,
  modelGroup,
  sampleSku,
  onUpdate,
}: {
  row: ModelGroupLabel;
  modelGroup: string;
  sampleSku: string;
  onUpdate: (patch: Partial<Omit<ModelGroupLabel, "key">>) => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const heroSku = row.image_sku?.trim().toUpperCase() ?? "";

  const heroProduct = useQuery({
    queryKey: ["admin-group-hero-image", heroSku],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("sku, main_image, name")
        .eq("sku", heroSku)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: heroSku.length >= 3,
    staleTime: 30_000,
  });

  const previewUrl = resolveModelGroupImage(row, {
    variants: heroProduct.data ? [{ sku: heroProduct.data.sku, main_image: heroProduct.data.main_image }] : [],
  });

  return (
    <div className="mt-3 space-y-3 rounded-sm border border-border/60 bg-secondary/20 p-3">
      <p className="text-xs font-medium text-foreground">{t("admin.content.categories.modelGroupImagePreview")}</p>
      <label className="block">
        <span className="text-xs text-muted-foreground">{t("admin.content.categories.modelGroupImage")}</span>
        <input
          value={row.image ?? ""}
          onChange={(e) => onUpdate({ image: e.target.value })}
          placeholder="https://…"
          className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <div className="mt-2">
          <label className="inline-flex cursor-pointer items-center rounded-sm border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] hover:border-foreground">
            {uploading ? "…" : t("admin.partners.upload")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploading(true);
                try {
                  const path = `model-groups/${modelGroup}`;
                  const url = await uploadAdminImage(path, file, t);
                  onUpdate({ image: url });
                  toast.success(t("admin.uploaded"));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("admin.error"));
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>
      </label>

      <label className="block">
        <span className="text-xs text-muted-foreground">{t("admin.content.categories.modelGroupImageSku")}</span>
        <input
          value={row.image_sku ?? ""}
          onChange={(e) => onUpdate({ image_sku: e.target.value.toUpperCase() })}
          placeholder={sampleSku}
          className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.content.categories.modelGroupImageSkuHint")}</p>
        {heroSku.length >= 3 && heroProduct.isFetched && !heroProduct.data && (
          <p className="mt-1 text-[11px] text-rose-600">{t("admin.content.categories.modelGroupImageSkuMissing")}</p>
        )}
      </label>

      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-24 w-24 rounded-sm border border-border object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}

export function ModelGroupLabelsEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");
  const stored = parseModelGroupLabels(value);

  const groupsQuery = useQuery({
    queryKey: ["admin-model-groups"],
    queryFn: fetchAdminModelGroups,
    staleTime: 60_000,
  });

  const persist = (labels: ModelGroupLabel[]) => {
    const cleaned = labelsWithContent(labels);
    onChange({
      ...value,
      "config.modelGroupLabels": {
        ru: serializeModelGroupLabels(cleaned),
        en: serializeModelGroupLabels(cleaned),
        hy: serializeModelGroupLabels(cleaned),
      },
    });
  };

  const updateGroup = (modelGroup: string, patch: Partial<Omit<ModelGroupLabel, "key">>) => {
    persist(upsertModelGroupLabel(stored, modelGroup, patch));
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
                <GroupCardImageFields
                  row={row}
                  modelGroup={g.model_group}
                  sampleSku={g.sample_sku}
                  onUpdate={(patch) => updateGroup(g.model_group, patch)}
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
