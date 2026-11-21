import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Eye, EyeOff, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadAdminImage } from "@/lib/admin-upload";
import {
  createHomeBannerDraft,
  fetchAllHomeBanners,
  saveHomeBanners,
  type HomeBanner,
} from "@/lib/banners";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admini/banners")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: AdminBanners,
});

function AdminBanners() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-banners"],
    queryFn: fetchAllHomeBanners,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["home-banners"] });
  };

  /** Persists the full banner list into `site_content` (key: home_banners). */
  const persist = useMutation({
    mutationFn: async (rows: HomeBanner[]) => saveHomeBanners(rows, t("admin.writeNoRow")),
    onSuccess: (rows) => {
      qc.setQueryData(["admin-banners"], rows);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const create = useMutation({
    mutationFn: async () => {
      const rows = list.data ?? [];
      return persist.mutateAsync([...rows, createHomeBannerDraft(rows)]);
    },
    onSuccess: () => toast.success(t("admin.banners.added")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HomeBanner> }) => {
      const rows = list.data ?? [];
      const now = new Date().toISOString();
      return persist.mutateAsync(
        rows.map((row) => (row.id === id ? { ...row, ...patch, updated_at: now } : row)),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const rows = list.data ?? [];
      return persist.mutateAsync(rows.filter((row) => row.id !== id));
    },
    onSuccess: () => toast.success(t("admin.removed")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl">{t("admin.banners.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.banners.intro")}</p>

      <div className="mt-6">
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate()}
          className="inline-flex items-center gap-1 rounded-xl bg-foreground px-4 py-3 text-xs uppercase tracking-wider text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("admin.banners.add")}
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {list.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : (list.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("admin.banners.empty")}
          </p>
        ) : (
          (list.data ?? []).map((row) => (
            <BannerEditor
              key={row.id}
              row={row}
              onSave={(patch) => update.mutate({ id: row.id, patch })}
              onToggle={() => update.mutate({ id: row.id, patch: { is_active: !row.is_active } })}
              onDelete={() => {
                if (
                  !confirm(
                    t("admin.deleteConfirm", { name: row.title || t("admin.banners.blank") }),
                  )
                )
                  return;
                remove.mutate(row.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: "text" | "number";
}) {
  const cls =
    "mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}

function BannerEditor({
  row,
  onSave,
  onToggle,
  onDelete,
}: {
  row: HomeBanner;
  onSave: (patch: Partial<HomeBanner>) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(row.title ?? "");
  const [titleEn, setTitleEn] = useState(row.title_en ?? "");
  const [titleHy, setTitleHy] = useState(row.title_hy ?? "");
  const [subtitle, setSubtitle] = useState(row.subtitle ?? "");
  const [subtitleEn, setSubtitleEn] = useState(row.subtitle_en ?? "");
  const [subtitleHy, setSubtitleHy] = useState(row.subtitle_hy ?? "");
  const [linkUrl, setLinkUrl] = useState(row.link_url ?? "");
  const [linkLabel, setLinkLabel] = useState(row.link_label ?? "");
  const [linkLabelEn, setLinkLabelEn] = useState(row.link_label_en ?? "");
  const [linkLabelHy, setLinkLabelHy] = useState(row.link_label_hy ?? "");
  const [sortOrder, setSortOrder] = useState(String(row.sort_order ?? 0));
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminImage(`banners/${row.id}`, file, t);
      onSave({ image_url: url });
      toast.success(t("admin.banners.imageSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <article className="rounded-xl border border-border bg-background p-4 md:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="relative h-28 w-44 shrink-0 overflow-hidden rounded-sm border border-border bg-secondary"
        >
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </span>
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-muted-foreground">
              <Upload className="h-5 w-5 animate-pulse" />
            </span>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-lg">{row.title || t("admin.banners.blank")}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                row.is_active
                  ? "bg-emerald-600/15 text-emerald-700"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {row.is_active ? t("admin.published") : t("admin.draft")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`${t("admin.banners.titleField")} (RU)`}
              value={title}
              onChange={setTitle}
            />
            <Field
              label={`${t("admin.banners.titleField")} (EN)`}
              value={titleEn}
              onChange={setTitleEn}
            />
            <Field
              label={`${t("admin.banners.titleField")} (HY)`}
              value={titleHy}
              onChange={setTitleHy}
            />
            <Field
              label={t("admin.banners.sortOrder")}
              value={sortOrder}
              onChange={setSortOrder}
              type="number"
            />
            <div className="sm:col-span-2">
              <Field
                label={`${t("admin.banners.subtitle")} (RU)`}
                value={subtitle}
                onChange={setSubtitle}
                multiline
              />
            </div>
            <Field
              label={`${t("admin.banners.subtitle")} (EN)`}
              value={subtitleEn}
              onChange={setSubtitleEn}
              multiline
            />
            <Field
              label={`${t("admin.banners.subtitle")} (HY)`}
              value={subtitleHy}
              onChange={setSubtitleHy}
              multiline
            />
            <div className="sm:col-span-2">
              <Field label={t("admin.banners.linkUrl")} value={linkUrl} onChange={setLinkUrl} />
            </div>
            <Field
              label={`${t("admin.banners.linkLabel")} (RU)`}
              value={linkLabel}
              onChange={setLinkLabel}
            />
            <Field
              label={`${t("admin.banners.linkLabel")} (EN)`}
              value={linkLabelEn}
              onChange={setLinkLabelEn}
            />
            <Field
              label={`${t("admin.banners.linkLabel")} (HY)`}
              value={linkLabelHy}
              onChange={setLinkLabelHy}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onSave({
                  title: title.trim() || null,
                  title_en: titleEn.trim() || null,
                  title_hy: titleHy.trim() || null,
                  subtitle: subtitle.trim() || null,
                  subtitle_en: subtitleEn.trim() || null,
                  subtitle_hy: subtitleHy.trim() || null,
                  link_url: linkUrl.trim() || null,
                  link_label: linkLabel.trim() || null,
                  link_label_en: linkLabelEn.trim() || null,
                  link_label_hy: linkLabelHy.trim() || null,
                  sort_order: Number.isFinite(Number(sortOrder))
                    ? Math.trunc(Number(sortOrder))
                    : 0,
                })
              }
              className="rounded-sm bg-foreground px-3 py-2 text-xs uppercase tracking-wider text-background"
            >
              {t("admin.save")}
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-2 text-xs uppercase tracking-wider"
            >
              {row.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {row.is_active ? t("admin.banners.hide") : t("admin.banners.show")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-sm border border-destructive/40 px-3 py-2 text-xs uppercase tracking-wider text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("admin.delete")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
