import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CollectionSection } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admini/collections")({
  component: AdminCollections,
});

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  name_hy: string | null;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_weight: number;
  section: CollectionSection | null;
};

type LinkedProduct = {
  product_sku: string;
  products: { sku: string; name: string | null; main_image: string | null } | null;
};

const SECTIONS: { value: CollectionSection; labelKey: string }[] = [
  { value: "design", labelKey: "admin.collections.sectionDesign" },
  { value: "timeless", labelKey: "admin.collections.sectionTimeless" },
  { value: "special", labelKey: "admin.collections.sectionSpecial" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadCover(
  slug: string,
  file: File,
  t: (key: string, vars?: Record<string, string | number>) => string,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(t("admin.notImage"));
  if (file.size > 8 * 1024 * 1024) throw new Error(t("admin.tooLarge5mb"));
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `collections/${slug}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("product-media")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("product-media").getPublicUrl(path);
  if (!data.publicUrl) throw new Error(t("admin.urlFailed"));
  return `${data.publicUrl}?v=${Date.now()}`;
}

function CoverPreview({ url, name }: { url: string | null; name: string }) {
  const isLogo = !!url?.includes("/smeg-logo");
  if (!url) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sm border border-dashed border-border bg-secondary/40 text-[10px] uppercase tracking-widest text-muted-foreground">
        —
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className={`h-24 w-24 shrink-0 rounded-sm border border-border bg-[#1a1a1a] ${
        isLogo ? "object-contain p-2" : "object-cover"
      }`}
    />
  );
}

function CollectionProducts({
  collectionId,
  t,
}: {
  collectionId: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const linked = useQuery({
    queryKey: ["admin-collection-products", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_products")
        .select("product_sku, products(sku, name, main_image)")
        .eq("collection_id", collectionId)
        .order("sort_weight", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LinkedProduct[];
    },
    enabled: open,
  });

  const search = useQuery({
    queryKey: ["admin-collection-product-search", query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const { data, error } = await supabase.rpc("search_products", {
        q: query.trim(),
        only_published: false,
        max_rows: 12,
      });
      if (error) throw error;
      const skus = (data ?? []).map((r: { sku: string }) => r.sku);
      if (!skus.length) return [];
      const { data: products, error: e2 } = await supabase
        .from("products")
        .select("sku, name, main_image")
        .in("sku", skus);
      if (e2) throw e2;
      return products ?? [];
    },
    enabled: open && query.trim().length >= 2,
  });

  const linkedSkus = new Set((linked.data ?? []).map((l) => l.product_sku));

  const add = useMutation({
    mutationFn: async (sku: string) => {
      const { error } = await supabase.from("collection_products").insert({
        collection_id: collectionId,
        product_sku: sku,
        sort_weight: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collection-products", collectionId] });
      toast.success(t("admin.collections.productAdded"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (sku: string) => {
      const { error } = await supabase
        .from("collection_products")
        .delete()
        .eq("collection_id", collectionId)
        .eq("product_sku", sku);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collection-products", collectionId] });
      toast.success(t("admin.collections.productRemoved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        {t("admin.collections.products")}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.collections.searchProduct")}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />

          {search.data && search.data.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-sm border border-border p-2">
              {search.data
                .filter((p) => !linkedSkus.has(p.sku))
                .map((p) => (
                  <li key={p.sku}>
                    <button
                      type="button"
                      onClick={() => add.mutate(p.sku)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-secondary"
                    >
                      {p.main_image && (
                        <img src={p.main_image} alt="" className="h-8 w-8 shrink-0 object-cover" />
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {linked.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("admin.loading")}</p>
          ) : linked.data?.length ? (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {linked.data.map((row) => (
                <li
                  key={row.product_sku}
                  className="flex items-center gap-2 rounded-sm border border-border px-2 py-1.5 text-sm"
                >
                  {row.products?.main_image && (
                    <img src={row.products.main_image} alt="" className="h-8 w-8 shrink-0 object-cover" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">{row.product_sku}</span>
                  <span className="min-w-0 flex-1 truncate">{row.products?.name ?? row.product_sku}</span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(row.product_sku)}
                    className="text-muted-foreground hover:text-rose-600"
                    aria-label={t("admin.removed")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("admin.collections.noProducts")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminCollections() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const list = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id,slug,name,name_en,name_hy,description,cover_image,is_published,sort_weight,section")
        .order("sort_weight", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as CollectionRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const slug = slugify(name);
      if (!slug) throw new Error(t("admin.enterName"));
      const { error } = await supabase.from("collections").insert({
        name: name.trim(),
        slug,
        section: "special",
        sort_weight: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections-list"] });
      toast.success(t("admin.collections.created"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("collections").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections-list"] });
      toast.success(t("admin.removed"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const handleCoverUpload = async (id: string, slug: string, file: File) => {
    setUploadingId(id);
    try {
      const url = await uploadCover(slug, file, t);
      await update.mutateAsync({ id, patch: { cover_image: url } });
      toast.success(t("admin.collections.coverUploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("admin.collections.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.collections.desc")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("admin.collections.coverHint")}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) create.mutate(newName);
        }}
        className="mt-8 flex gap-3"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("admin.collections.newPlaceholder")}
          maxLength={120}
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button type="submit" disabled={create.isPending} className="rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background disabled:opacity-50">
          {t("admin.create")}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {list.data?.map((c) => (
          <div key={c.id} className="rounded-sm border border-border p-4">
            <div className="flex items-start gap-4">
              <CoverPreview url={c.cover_image} name={c.name} />
              <div className="flex-1 space-y-2">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value !== c.name && update.mutate({ id: c.id, patch: { name: e.target.value } })}
                  className="w-full bg-transparent font-serif text-xl outline-none"
                />
                <p className="font-mono text-xs text-muted-foreground">/{c.slug}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    defaultValue={c.name_en ?? ""}
                    placeholder={t("admin.collections.nameEn")}
                    onBlur={(e) =>
                      (e.target.value || null) !== c.name_en &&
                      update.mutate({ id: c.id, patch: { name_en: e.target.value || null } })
                    }
                    className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                  <input
                    defaultValue={c.name_hy ?? ""}
                    placeholder={t("admin.collections.nameHy")}
                    onBlur={(e) =>
                      (e.target.value || null) !== c.name_hy &&
                      update.mutate({ id: c.id, patch: { name_hy: e.target.value || null } })
                    }
                    className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("admin.collections.section")}
                    </span>
                    <select
                      value={c.section ?? "special"}
                      onChange={(e) =>
                        update.mutate({ id: c.id, patch: { section: e.target.value as CollectionSection } })
                      }
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {t(s.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("admin.collections.sortWeight")}
                    </span>
                    <input
                      type="number"
                      defaultValue={c.sort_weight}
                      onBlur={(e) => {
                        const next = parseInt(e.target.value, 10) || 0;
                        if (next !== c.sort_weight) update.mutate({ id: c.id, patch: { sort_weight: next } });
                      }}
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </label>
                </div>
                <textarea
                  defaultValue={c.description ?? ""}
                  placeholder={t("admin.collections.descPlaceholder")}
                  rows={2}
                  onBlur={(e) =>
                    (e.target.value || null) !== c.description &&
                    update.mutate({ id: c.id, patch: { description: e.target.value || null } })
                  }
                  className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
                <input
                  defaultValue={c.cover_image ?? ""}
                  placeholder={t("admin.collections.coverPlaceholder")}
                  onBlur={(e) =>
                    (e.target.value || null) !== c.cover_image &&
                    update.mutate({ id: c.id, patch: { cover_image: e.target.value || null } })
                  }
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground">
                  <Upload className="h-3 w-3" />
                  {uploadingId === c.id ? t("admin.loading") : t("admin.collections.uploadCover")}
                  <input
                    ref={(el) => { fileRefs.current[c.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingId === c.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleCoverUpload(c.id, c.slug, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <CollectionProducts collectionId={c.id} t={t} />
              </div>
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={() => update.mutate({ id: c.id, patch: { is_published: !c.is_published } })}
                  className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
                  title={t("admin.visibility")}
                >
                  {c.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => confirm(t("admin.deleteConfirm", { name: c.name })) && remove.mutate(c.id)}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.isLoading && <p className="text-sm text-muted-foreground">{t("admin.loading")}</p>}
        {list.data && list.data.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.collections.empty")}</p>}
      </div>
    </div>
  );
}
