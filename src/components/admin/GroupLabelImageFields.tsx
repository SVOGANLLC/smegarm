import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { resolveModelGroupImage, type ModelGroupLabel } from "@/lib/model-group-labels";
import { uploadAdminImage } from "@/lib/admin-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GroupImageState = { image: string; image_sku: string };

export const emptyGroupImage = (): GroupImageState => ({ image: "", image_sku: "" });

export function groupImageFromLabel(row?: ModelGroupLabel): GroupImageState {
  return { image: row?.image ?? "", image_sku: row?.image_sku ?? "" };
}

export function GroupLabelImageFields({
  groupKey,
  image,
  imageSku,
  sampleSku,
  onChange,
  onUploadSave,
}: {
  groupKey: string;
  image: string;
  imageSku: string;
  sampleSku?: string;
  onChange: (patch: Partial<GroupImageState>) => void;
  /** When set, upload saves immediately (like legacy content editor). */
  onUploadSave?: (patch: Partial<GroupImageState>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const heroSku = imageSku.trim().toUpperCase();

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

  const previewUrl = resolveModelGroupImage(
    { key: groupKey, image: image || undefined, image_sku: heroSku || undefined },
    { variants: heroProduct.data ? [{ sku: heroProduct.data.sku, main_image: heroProduct.data.main_image }] : [] },
  );

  return (
    <div className="space-y-3 rounded-sm border border-border/60 bg-secondary/20 p-3">
      <p className="text-xs font-medium text-foreground">{t("admin.content.categories.modelGroupImagePreview")}</p>
      <label className="block">
        <span className="text-xs text-muted-foreground">{t("admin.content.categories.modelGroupImage")}</span>
        <input
          value={image}
          onChange={(e) => onChange({ image: e.target.value })}
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
                  const path = `model-groups/${groupKey}`;
                  const url = await uploadAdminImage(path, file, t);
                  if (onUploadSave) await onUploadSave({ image: url });
                  else onChange({ image: url });
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
          value={imageSku}
          onChange={(e) => onChange({ image_sku: e.target.value.toUpperCase() })}
          placeholder={sampleSku ?? groupKey}
          className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.content.categories.modelGroupImageSkuHint")}</p>
        {heroSku.length >= 3 && heroProduct.isFetched && !heroProduct.data && (
          <p className="mt-1 text-[11px] text-rose-600">{t("admin.content.categories.modelGroupImageSkuMissing")}</p>
        )}
      </label>

      {previewUrl ? (
        <img src={previewUrl} alt="" key={previewUrl} className="h-24 w-24 rounded-sm border border-border object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}
