import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadAdminImage } from "@/lib/admin-upload";
import { useI18n } from "@/lib/i18n";
import { slugifyNewsTitle, type NewsRow } from "@/lib/news";

export const Route = createFileRoute("/_authenticated/admini/news")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: AdminNews,
});

function AdminNews() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draftTitle, setDraftTitle] = useState("");

  const list = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("sort_order", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) throw new Error(t("admin.enterName"));
      const slug = slugifyNewsTitle(trimmed);
      const next = ((list.data?.[0]?.sort_order ?? 0) + 10) | 0;
      const { error } = await supabase.from("news").insert({
        title: trimmed,
        slug,
        sort_order: next,
        is_published: false,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraftTitle("");
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      toast.success(t("admin.news.added"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewsRow> }) => {
      const { error } = await supabase.from("news").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      qc.invalidateQueries({ queryKey: ["news-public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      qc.invalidateQueries({ queryKey: ["news-public"] });
      toast.success(t("admin.removed"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl">{t("admin.news.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.news.intro")}</p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(draftTitle);
        }}
      >
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder={t("admin.news.newTitle")}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-foreground px-4 py-3 text-xs uppercase tracking-wider text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("admin.news.create")}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {list.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : (list.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.news.empty")}</p>
        ) : (
          (list.data ?? []).map((row) => (
            <NewsEditor
              key={row.id}
              row={row}
              onSave={(patch) => update.mutate({ id: row.id, patch })}
              onToggle={() => update.mutate({ id: row.id, patch: { is_published: !row.is_published } })}
              onDelete={() => {
                if (!confirm(t("admin.deleteConfirm", { name: row.title }))) return;
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

function NewsEditor({
  row,
  onSave,
  onToggle,
  onDelete,
}: {
  row: NewsRow;
  onSave: (patch: Partial<NewsRow>) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(row.title);
  const [titleEn, setTitleEn] = useState(row.title_en ?? "");
  const [titleHy, setTitleHy] = useState(row.title_hy ?? "");
  const [excerpt, setExcerpt] = useState(row.excerpt ?? "");
  const [excerptEn, setExcerptEn] = useState(row.excerpt_en ?? "");
  const [excerptHy, setExcerptHy] = useState(row.excerpt_hy ?? "");
  const [slug, setSlug] = useState(row.slug);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminImage(`news/${row.id}`, file, t);
      onSave({ image_url: url });
      toast.success(t("admin.news.imageSaved"));
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
          onClick={() => fileRef.current?.click()}
          className="relative h-28 w-36 shrink-0 overflow-hidden rounded-sm border border-border bg-secondary"
        >
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Upload className="h-5 w-5" />
            </span>
          )}
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
            <span className="font-serif text-lg">{row.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                row.is_published ? "bg-emerald-600/15 text-emerald-700" : "bg-secondary text-muted-foreground"
              }`}
            >
              {row.is_published ? t("admin.published") : t("admin.draft")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("admin.news.titleField")} (RU)`} value={title} onChange={setTitle} />
            <Field label="Slug" value={slug} onChange={setSlug} />
            <Field label={`${t("admin.news.titleField")} (EN)`} value={titleEn} onChange={setTitleEn} />
            <Field label={`${t("admin.news.titleField")} (HY)`} value={titleHy} onChange={setTitleHy} />
            <Field label={`${t("admin.news.excerpt")} (RU)`} value={excerpt} onChange={setExcerpt} multiline />
            <Field label={`${t("admin.news.excerpt")} (EN)`} value={excerptEn} onChange={setExcerptEn} multiline />
            <Field label={`${t("admin.news.excerpt")} (HY)`} value={excerptHy} onChange={setExcerptHy} multiline />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() =>
                onSave({
                  title,
                  title_en: titleEn || null,
                  title_hy: titleHy || null,
                  excerpt: excerpt || null,
                  excerpt_en: excerptEn || null,
                  excerpt_hy: excerptHy || null,
                  slug: slug.trim() || row.slug,
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
              {row.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {row.is_published ? t("admin.unpublish") : t("admin.publish")}
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
