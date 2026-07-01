import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { uploadAdminImage } from "@/lib/admin-upload";

export function ProductImageUploader({
  sku,
  onUploaded,
  label,
  multiple,
  storagePrefix,
}: {
  sku: string;
  onUploaded: (url: string) => void | Promise<void>;
  label: string;
  multiple?: boolean;
  /** Defaults to `products/{sku}`. */
  storagePrefix?: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const prefix = storagePrefix ?? `products/${sku}`;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const url = await uploadAdminImage(path, file, t);
        await onUploaded(url);
      }
      toast.success(t("admin.product.uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.product.uploadError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground">
      <Upload className="h-3 w-3" />
      {busy ? t("admin.loading") : label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
