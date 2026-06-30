import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CollectionSection } from "@/lib/products";
import { isAutoCollectionSlug, applyCollectionMembershipToProduct } from "@/lib/collection-auto-sync";
import { deriveCollectionSlug } from "@/lib/collection-slug";
import {
  createCollectionAdmin,
  deleteCollectionAdmin,
  updateCollectionAdmin,
} from "@/lib/collections-admin.functions";
import { useServerFn } from "@tanstack/react-start";

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
  description_en: string | null;
  description_hy: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_weight: number;
  section: CollectionSection | null;
  product_count?: number;
};

type LinkedProduct = {
  product_sku: string;
  products: {
    sku: string;
    name: string | null;
    main_image: string | null;
    aesthetic?: string | null;
    theme_key?: string | null;
  } | null;
};

const SECTIONS: { value: CollectionSection; labelKey: string }[] = [
  { value: "design", labelKey: "admin.collections.sectionDesign" },
  { value: "timeless", labelKey: "admin.collections.sectionTimeless" },
  { value: "special", labelKey: "admin.collections.sectionSpecial" },
];

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
  collectionSlug,
  t,
}: {
  collectionId: string;
  collectionSlug: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const invalidateCaches = () => {
    qc.invalidateQueries({ queryKey: ["admin-collection-products", collectionId] });
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
    qc.invalidateQueries({ queryKey: ["collections-list"] });
    qc.invalidateQueries({ queryKey: ["collection", collectionSlug] });
  };

  const linked = useQuery({
    queryKey: ["admin-collection-products", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_products")
        .select("product_sku, products(sku, name, main_image, aesthetic, theme_key)")
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
    mutationFn: async (productSku: string) => {
      const { data, error } = await supabase
        .from("collection_products")
        .upsert(
          {
            collection_id: collectionId,
            product_sku: productSku,
            sort_weight: 0,
          },
          { onConflict: "collection_id,product_sku" },
        )
        .select("product_sku")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(data, t("admin.writeNoRow"));
      await applyCollectionMembershipToProduct(productSku, collectionSlug, "add");
    },
    onSuccess: () => {
      setQuery("");
      invalidateCaches();
      toast.success(t("admin.collections.productAdded"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (productSku: string) => {
      const { data, error } = await supabase
        .from("collection_products")
        .delete()
        .eq("collection_id", collectionId)
        .eq("product_sku", productSku)
        .select("product_sku")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(data, t("admin.writeNoRow"));
      await applyCollectionMembershipToProduct(productSku, collectionSlug, "remove");
    },
    onSuccess: (_data, productSku) => {
      invalidateCaches();
      const row = linked.data?.find((r) => r.product_sku === productSku);
      const product = row?.products;
      if (product && isAutoCollectionSlug(collectionSlug, product)) {
        toast.message(t("admin.collections.productRemoved"), {
          description: t("admin.collections.themeSynced"),
        });
      } else {
        toast.success(t("admin.collections.productRemoved"));
      }
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
          <p className="text-xs text-muted-foreground">{t("admin.collections.productsInstantSave")}</p>
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
                  {row.products &&
                    isAutoCollectionSlug(collectionSlug, row.products) && (
                      <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                        {t("admin.collections.autoBadge")}
                      </span>
                    )}
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

type UpdateVars = {
  id: string;
  slug: string;
  patch: Record<string, unknown>;
  notify?: boolean;
  syncSlugFromName?: boolean;
  slugFallback?: string;
};

function CollectionEditorCard({
  c,
  t,
  uploadingId,
  savingId,
  fileRef,
  onSave,
  onPatch,
  onRemove,
  onCoverUpload,
}: {
  c: CollectionRow;
  t: (key: string, vars?: Record<string, string | number>) => string;
  uploadingId: string | null;
  savingId: string | null;
  fileRef: (el: HTMLInputElement | null) => void;
  onSave: (vars: UpdateVars) => Promise<CollectionRow>;
  onPatch: (vars: UpdateVars) => void;
  onRemove: () => void;
  onCoverUpload: (file: File) => void;
}) {
  const [name, setName] = useState(c.name);
  const [nameEn, setNameEn] = useState(c.name_en ?? "");
  const [nameHy, setNameHy] = useState(c.name_hy ?? "");
  const [description, setDescription] = useState(c.description ?? "");
  const [descriptionEn, setDescriptionEn] = useState(c.description_en ?? "");
  const [descriptionHy, setDescriptionHy] = useState(c.description_hy ?? "");
  const [dirty, setDirty] = useState(false);
  const isSaving = savingId === c.id;

  useEffect(() => {
    if (dirty || isSaving) return;
    setName(c.name);
    setNameEn(c.name_en ?? "");
    setNameHy(c.name_hy ?? "");
    setDescription(c.description ?? "");
    setDescriptionEn(c.description_en ?? "");
    setDescriptionHy(c.description_hy ?? "");
  }, [
    c.id,
    c.name,
    c.name_en,
    c.name_hy,
    c.description,
    c.description_en,
    c.description_hy,
    dirty,
    isSaving,
  ]);

  const buildTextPatch = (): Record<string, string | null> => {
    const patch: Record<string, string | null> = {};
    const nextName = name.trim();
    const prevName = c.name.trim();
    if (nextName !== prevName) {
      if (!nextName) throw new Error(t("admin.collections.nameRuRequired"));
      patch.name = nextName;
    }
    const nextEn = nameEn.trim() || null;
    if (nextEn !== (c.name_en?.trim() || null)) patch.name_en = nextEn;
    const nextHy = nameHy.trim() || null;
    if (nextHy !== (c.name_hy?.trim() || null)) patch.name_hy = nextHy;
    const nextDesc = description.trim() || null;
    if (nextDesc !== (c.description?.trim() || null)) patch.description = nextDesc;
    const nextDescEn = descriptionEn.trim() || null;
    if (nextDescEn !== (c.description_en?.trim() || null)) patch.description_en = nextDescEn;
    const nextDescHy = descriptionHy.trim() || null;
    if (nextDescHy !== (c.description_hy?.trim() || null)) patch.description_hy = nextDescHy;
    return patch;
  };

  const saveTexts = async () => {
    let patch: Record<string, string | null>;
    try {
      patch = buildTextPatch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
      return;
    }
    if (!Object.keys(patch).length) {
      toast.message(t("admin.collections.nothingToSave"));
      return;
    }
    try {
      await onSave({
        id: c.id,
        slug: c.slug,
        patch,
        syncSlugFromName: "name" in patch,
        slugFallback: nameEn,
        notify: true,
      });
      setDirty(false);
    } catch {
      /* toast from parent */
    }
  };

  const saveTextsOnBlur = () => {
    if (dirty && !isSaving) void saveTexts();
  };

  const fieldClass =
    "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  const labelClass = "mb-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
  const previewSlug = deriveCollectionSlug(name, nameEn, c.slug);

  return (
    <div className="rounded-sm border border-border p-4">
      <div className="flex items-start gap-4">
        <CoverPreview url={c.cover_image} name={name || c.name} />
        <div className="flex-1 space-y-3">
          <div>
            <span className={labelClass}>{t("admin.collections.nameRu")}</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              onBlur={saveTextsOnBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveTexts();
                }
              }}
              className="w-full bg-transparent font-serif text-xl outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            /{previewSlug}
            {previewSlug !== c.slug && (
              <span className="ml-2 font-sans normal-case text-foreground/60">
                ({t("admin.collections.slugPending")})
              </span>
            )}
            {typeof c.product_count === "number" && (
              <span className="ml-2 font-sans normal-case">
                · {t("admin.collections.productCount", { n: c.product_count })}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{t("admin.collections.namesHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving || !dirty}
              onClick={() => void saveTexts()}
              className="rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.16em] text-background disabled:opacity-40"
            >
              {isSaving ? t("admin.loading") : t("admin.collections.saveTexts")}
            </button>
            {dirty && (
              <span className="text-xs text-amber-700 dark:text-amber-400">{t("admin.collections.unsaved")}</span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{t("admin.collections.nameEn")}</span>
              <input
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  setDirty(true);
                }}
                onBlur={saveTextsOnBlur}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t("admin.collections.nameHy")}</span>
              <input
                value={nameHy}
                onChange={(e) => {
                  setNameHy(e.target.value);
                  setDirty(true);
                }}
                onBlur={saveTextsOnBlur}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{t("admin.collections.section")}</span>
              <select
                value={c.section ?? "special"}
                onChange={(e) =>
                  onPatch({
                    id: c.id,
                    slug: c.slug,
                    patch: { section: e.target.value as CollectionSection },
                    notify: true,
                  })
                }
                className={fieldClass}
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>{t("admin.collections.sortWeight")}</span>
              <input
                type="number"
                defaultValue={c.sort_weight}
                onBlur={(e) => {
                  const next = parseInt(e.target.value, 10) || 0;
                  if (next !== c.sort_weight) {
                    onPatch({ id: c.id, slug: c.slug, patch: { sort_weight: next }, notify: true });
                  }
                }}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-1">
            <label className="block">
              <span className={labelClass}>{t("admin.collections.descRu")}</span>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
                onBlur={saveTextsOnBlur}
                rows={2}
                className={`${fieldClass} resize-none`}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>{t("admin.collections.descEn")}</span>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => {
                    setDescriptionEn(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={saveTextsOnBlur}
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t("admin.collections.descHy")}</span>
                <textarea
                  value={descriptionHy}
                  onChange={(e) => {
                    setDescriptionHy(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={saveTextsOnBlur}
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </label>
            </div>
          </div>
          <input
            defaultValue={c.cover_image ?? ""}
            placeholder={t("admin.collections.coverPlaceholder")}
            onBlur={(e) => {
              const next = e.target.value.trim() || null;
              const prev = c.cover_image?.trim() || null;
              if (next !== prev) {
                onPatch({ id: c.id, slug: c.slug, patch: { cover_image: next }, notify: true });
              }
            }}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground">
            <Upload className="h-3 w-3" />
            {uploadingId === c.id ? t("admin.loading") : t("admin.collections.uploadCover")}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploadingId === c.id}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onCoverUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <CollectionProducts collectionId={c.id} collectionSlug={c.slug} t={t} />
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={() =>
              onPatch({ id: c.id, slug: c.slug, patch: { is_published: !c.is_published }, notify: true })
            }
            className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
            title={t("admin.visibility")}
          >
            {c.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminCollections() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const updateCollectionFn = useServerFn(updateCollectionAdmin);
  const createCollectionFn = useServerFn(createCollectionAdmin);
  const deleteCollectionFn = useServerFn(deleteCollectionAdmin);
  const [newName, setNewName] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const list = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const [{ data, error }, { data: links, error: linkErr }] = await Promise.all([
        supabase
          .from("collections")
          .select("id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight,section")
          .order("sort_weight", { ascending: false })
          .order("name"),
        supabase.from("collection_products").select("collection_id"),
      ]);
      if (error) throw error;
      if (linkErr) throw linkErr;
      const counts = new Map<string, number>();
      for (const row of links ?? []) {
        counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
      }
      return ((data ?? []) as CollectionRow[]).map((c) => ({
        ...c,
        product_count: counts.get(c.id) ?? 0,
      }));
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      await createCollectionFn({ data: { name: name.trim() } });
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
    mutationFn: async (vars: UpdateVars) => {
      const row = await updateCollectionFn({ data: vars });
      return row as CollectionRow;
    },
    onSuccess: (data, { slug: prevSlug, notify }) => {
      qc.setQueryData(
        ["admin-collections"],
        (old: CollectionRow[] | undefined) =>
          old?.map((row) =>
            row.id === data.id ? { ...row, ...data, product_count: row.product_count } : row,
          ),
      );
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections-list"] });
      qc.invalidateQueries({ queryKey: ["collection", prevSlug] });
      if (data.slug !== prevSlug) {
        qc.invalidateQueries({ queryKey: ["collection", data.slug] });
      }
      if (notify) toast.success(t("admin.collections.updated"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteCollectionFn({ data: { id } });
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
      await update.mutateAsync({ id, slug, patch: { cover_image: url } });
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
          <CollectionEditorCard
            key={c.id}
            c={c}
            t={t}
            uploadingId={uploadingId}
            savingId={update.isPending ? (update.variables?.id ?? null) : null}
            fileRef={(el) => {
              fileRefs.current[c.id] = el;
            }}
            onSave={(vars) => update.mutateAsync(vars)}
            onPatch={(vars) => update.mutate(vars)}
            onRemove={() => confirm(t("admin.deleteConfirm", { name: c.name })) && remove.mutate(c.id)}
            onCoverUpload={(file) => void handleCoverUpload(c.id, c.slug, file)}
          />
        ))}
        {list.isLoading && <p className="text-sm text-muted-foreground">{t("admin.loading")}</p>}
        {list.data && list.data.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.collections.empty")}</p>}
      </div>
    </div>
  );
}
