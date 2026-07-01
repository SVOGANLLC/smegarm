import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Upload, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ProductCollectionsEditor } from "@/components/admin/ProductCollectionsEditor";
import {
  normalizeEanForSave,
  parseSpecsText,
  specsToText,
  syncEanFieldToSpecs,
  syncEanFromSpecsEdit,
  type SpecsLocale,
} from "@/lib/product-ean-sync";
import { assertRowUpdated } from "@/lib/supabase-assert";

export const Route = createFileRoute("/_authenticated/admini/products/$sku")({
  component: EditProduct,
});

type FormState = {
  name: string;
  description: string;
  name_en: string;
  description_en: string;
  name_hy: string;
  description_hy: string;
  category: string;
  category_en: string;
  category_hy: string;
  colour: string;
  colour_en: string;
  colour_hy: string;
  aesthetic: string;
  family: string;
  ean: string;
  price_amd: string;
  price_old: string;
  discount_percent: string;
  stock_qty: string;
  lead_time_days: string;
  is_published: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_special_offer: boolean;
  badge_text: string;
  seo_title: string;
  seo_description: string;
  main_image: string;
  images: string;
  specs: string;
  specs_en: string;
  specs_hy: string;
};

function productToForm(data: Record<string, unknown>): FormState {
  return {
    name: (data.name as string) ?? "",
    description: (data.description as string) ?? "",
    name_en: (data.name_en as string) ?? "",
    description_en: (data.description_en as string) ?? "",
    name_hy: (data.name_hy as string) ?? "",
    description_hy: (data.description_hy as string) ?? "",
    category: (data.category as string) ?? "",
    category_en: (data.category_en as string) ?? "",
    category_hy: (data.category_hy as string) ?? "",
    colour: (data.colour as string) ?? "",
    colour_en: (data.colour_en as string) ?? "",
    colour_hy: (data.colour_hy as string) ?? "",
    aesthetic: (data.aesthetic as string) ?? "",
    family: (data.family as string) ?? "",
    ean: (data.ean as string) ?? "",
    price_amd: data.price_amd != null ? String(data.price_amd) : "",
    price_old: data.price_old != null ? String(data.price_old) : "",
    discount_percent: data.discount_percent != null ? String(data.discount_percent) : "0",
    stock_qty: data.stock_qty != null ? String(data.stock_qty) : "0",
    lead_time_days: data.lead_time_days != null ? String(data.lead_time_days) : "",
    is_published: !!data.is_published,
    is_featured: !!data.is_featured,
    is_new: !!data.is_new,
    is_bestseller: !!data.is_bestseller,
    is_special_offer: !!data.is_special_offer,
    badge_text: (data.badge_text as string) ?? "",
    seo_title: (data.seo_title as string) ?? "",
    seo_description: (data.seo_description as string) ?? "",
    main_image: (data.main_image as string) ?? "",
    images: Array.isArray(data.images) ? (data.images as string[]).join("\n") : "",
    specs: specsToText(data.specs as Record<string, string> | null),
    specs_en: specsToText(data.specs_en as Record<string, string> | null),
    specs_hy: specsToText(data.specs_hy as Record<string, string> | null),
  };
}

function EditProduct() {
  const { t } = useI18n();
  const { sku } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupSku, setDupSku] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSku, setRenameSku] = useState("");
  const hydratedSkuRef = useRef<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-product", sku],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("sku", sku).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    hydratedSkuRef.current = null;
  }, [sku]);

  useEffect(() => {
    if (!q.data || hydratedSkuRef.current === sku) return;
    setForm(productToForm(q.data as Record<string, unknown>));
    hydratedSkuRef.current = sku;
  }, [sku, q.data]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const price = f.price_amd.trim() ? parseInt(f.price_amd, 10) : null;
      const priceOld = f.price_old.trim() ? parseInt(f.price_old, 10) : null;
      const disc = Math.max(0, Math.min(90, parseInt(f.discount_percent, 10) || 0));
      if (price !== null && (isNaN(price) || price < 0)) throw new Error(t("admin.product.priceInvalid"));
      const images = f.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const stockQty = Math.max(0, parseInt(f.stock_qty, 10) || 0);
      const leadRaw = f.lead_time_days.trim();
      const leadDays = leadRaw === "" ? null : Math.max(0, Math.min(365, parseInt(leadRaw, 10) || 0));
      const { data, error } = await supabase
        .from("products")
        .update({
          name: f.name.trim().slice(0, 500),
          description: f.description.slice(0, 10000),
          name_en: f.name_en.trim().slice(0, 500) || null,
          description_en: f.description_en.slice(0, 10000) || null,
          name_hy: f.name_hy.trim().slice(0, 500) || null,
          description_hy: f.description_hy.slice(0, 10000) || null,
          category: f.category.trim().slice(0, 200) || null,
          category_en: f.category_en.trim().slice(0, 200) || null,
          category_hy: f.category_hy.trim().slice(0, 200) || null,
          colour: f.colour.trim().slice(0, 120) || null,
          colour_en: f.colour_en.trim().slice(0, 120) || null,
          colour_hy: f.colour_hy.trim().slice(0, 120) || null,
          aesthetic: f.aesthetic.trim().slice(0, 120) || null,
          family: f.family.trim().slice(0, 120) || null,
          ean: f.ean.trim().slice(0, 32) || null,
          price_amd: price,
          price_old: priceOld,
          discount_percent: disc,
          stock_qty: stockQty,
          lead_time_days: leadDays,
          is_published: f.is_published,
          is_featured: f.is_featured,
          is_new: f.is_new,
          is_bestseller: f.is_bestseller,
          is_special_offer: f.is_special_offer,
          badge_text: f.badge_text.trim().slice(0, 60) || null,
          seo_title: f.seo_title.trim().slice(0, 160) || null,
          seo_description: f.seo_description.trim().slice(0, 320) || null,
          main_image: f.main_image.trim() || null,
          images,
          specs: parseSpecsText(f.specs),
          specs_en: parseSpecsText(f.specs_en),
          specs_hy: parseSpecsText(f.specs_hy),
        })
        .eq("sku", sku)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return assertRowUpdated(data, t("admin.saveNoRow"));
    },
    onSuccess: (saved) => {
      const row = saved as Record<string, unknown>;
      setForm(productToForm(row));
      qc.setQueryData(["admin-product", sku], saved);
      hydratedSkuRef.current = sku;
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-today"] });
      qc.invalidateQueries({ queryKey: ["product", sku] });
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const duplicateProduct = useMutation({
    mutationFn: async (newSku: string) => {
      const src = q.data;
      if (!src) throw new Error(t("admin.notFound"));
      const skuNew = newSku.trim().toUpperCase();
      if (!skuNew) throw new Error(t("admin.products.skuRequired"));
      const {
        sku: _sku,
        created_at: _c,
        updated_at: _u,
        stock_reserved: _r,
        ...rest
      } = src as Record<string, unknown> & { sku: string };
      const { error } = await supabase.from("products").insert({
        ...rest,
        sku: skuNew,
        is_published: false,
        stock_qty: 0,
        stock_reserved: 0,
      });
      if (error) throw error;
      return skuNew;
    },
    onSuccess: (newSku) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDupOpen(false);
      setDupSku("");
      toast.success(t("admin.product.duplicateDone"));
      navigate({ to: "/admini/products/$sku", params: { sku: newSku } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const renameProductSku = useMutation({
    mutationFn: async (newSkuRaw: string) => {
      const src = q.data;
      if (!src) throw new Error(t("admin.notFound"));
      const skuNew = newSkuRaw.trim().toUpperCase();
      if (!skuNew) throw new Error(t("admin.products.skuRequired"));
      if (skuNew === sku) throw new Error(t("admin.product.renameSkuDesc"));

      const { data: exists } = await supabase.from("products").select("sku").eq("sku", skuNew).maybeSingle();
      if (exists) throw new Error(t("admin.product.skuExists"));

      const {
        sku: _sku,
        created_at: _c,
        updated_at: _u,
        stock_reserved: _r,
        ...rest
      } = src as Record<string, unknown> & { sku: string };

      const { error: insErr } = await supabase.from("products").insert({
        ...rest,
        sku: skuNew,
      });
      if (insErr) throw insErr;

      const { error: colErr } = await supabase
        .from("collection_products")
        .update({ product_sku: skuNew })
        .eq("product_sku", sku);
      if (colErr) throw colErr;

      const { error: ordErr } = await supabase
        .from("order_items")
        .update({ product_sku: skuNew })
        .eq("product_sku", sku);
      if (ordErr) throw ordErr;

      const { error: delErr } = await supabase.from("products").delete().eq("sku", sku);
      if (delErr) throw delErr;

      return skuNew;
    },
    onSuccess: (skuNew) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setRenameOpen(false);
      setRenameSku("");
      setForm(null);
      toast.success(t("admin.product.renameSkuDone"));
      navigate({ to: "/admini/products/$sku", params: { sku: skuNew } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  if (q.isLoading || !form) return <div className="text-sm text-muted-foreground">{t("admin.loading")}</div>;
  if (!q.data) return <div>{t("admin.notFound")}</div>;

  return (
    <div>
      <Link
        to="/admini/products"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> {t("admin.backToList")}
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{sku}</p>
          <h1 className="mt-1 font-serif text-3xl">{q.data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{q.data.category}</p>
        </div>
        <Link
          to="/product/$sku"
          params={{ sku }}
          target="_blank"
          className="text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground"
        >
          {t("admin.openOnSite")}
        </Link>
        <button
          type="button"
          onClick={() => setDupOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" /> {t("admin.product.duplicate")}
        </button>
        <button
          type="button"
          onClick={() => {
            setRenameSku("");
            setRenameOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground"
        >
          {t("admin.product.renameSku")}
        </button>
      </div>

      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-sm border border-border bg-background p-6">
            <h2 className="font-serif text-2xl">{t("admin.product.renameSku")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.product.renameSkuDesc")}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{sku}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                renameProductSku.mutate(renameSku);
              }}
              className="mt-5 space-y-4"
            >
              <label className="block">
                <span className="eyebrow mb-1.5 block text-muted-foreground">{t("admin.products.skuLabel")}</span>
                <input
                  value={renameSku}
                  onChange={(e) => setRenameSku(e.target.value.toUpperCase())}
                  autoFocus
                  required
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={renameProductSku.isPending}
                  className="rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50"
                >
                  {renameProductSku.isPending ? "..." : t("admin.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-sm border border-border bg-background p-6">
            <h2 className="font-serif text-2xl">{t("admin.product.duplicate")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.product.duplicateDesc")}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                duplicateProduct.mutate(dupSku);
              }}
              className="mt-5 space-y-4"
            >
              <label className="block">
                <span className="eyebrow mb-1.5 block text-muted-foreground">{t("admin.products.skuLabel")}</span>
                <input
                  value={dupSku}
                  onChange={(e) => setDupSku(e.target.value.toUpperCase())}
                  autoFocus
                  required
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDupOpen(false)}
                  className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={duplicateProduct.isPending}
                  className="rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50"
                >
                  {duplicateProduct.isPending ? "..." : t("admin.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(normalizeEanForSave(form));
        }}
        className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <I18nContent sku={sku} form={form} setForm={setForm} />
          <Field label={t("admin.product.mainPhoto")}>
            <input
              value={form.main_image}
              onChange={(e) => setForm({ ...form, main_image: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <ImageUploader
              sku={sku}
              onUploaded={(url) => setForm((f) => (f ? { ...f, main_image: url } : f))}
              label={t("admin.product.uploadMain")}
            />
            {form.main_image && (
              <img
                src={form.main_image}
                alt=""
                className="mt-3 h-32 w-32 rounded-sm border border-border object-cover"
              />
            )}
          </Field>
          <Field label={t("admin.product.galleryHint")}>
            <textarea
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
              rows={6}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
            />
            <ImageUploader
              sku={sku}
              multiple
              onUploaded={(url) =>
                setForm((f) =>
                  f ? { ...f, images: (f.images ? f.images + "\n" : "") + url } : f,
                )
              }
              label={t("admin.product.addGallery")}
            />
            {form.images.trim() && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.images
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((url, i) => (
                    <div key={i} className="group relative">
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-sm border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) =>
                            f
                              ? {
                                  ...f,
                                  images: f.images
                                    .split("\n")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .filter((_, j) => j !== i)
                                    .join("\n"),
                                }
                              : f,
                          )
                        }
                        className="absolute -right-1 -top-1 hidden rounded-full bg-foreground p-0.5 text-background group-hover:block"
                        title={t("admin.product.remove")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </Field>
          <Field label="SEO title">
            <input
              value={form.seo_title}
              maxLength={160}
              onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="SEO description">
            <textarea
              value={form.seo_description}
              maxLength={320}
              rows={3}
              onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <SpecsFields form={form} setForm={setForm} />
        </div>

        <aside className="space-y-6 rounded-sm border border-border p-6">
          <div className="space-y-3 rounded-sm border border-border/60 bg-secondary/30 p-3">
            <p className="eyebrow text-muted-foreground">{t("admin.product.catalogFields")}</p>
            <Field label={t("admin.products.categoryLabel")}>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ovens"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.categoryEn")}>
              <input
                value={form.category_en}
                onChange={(e) => setForm({ ...form, category_en: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.categoryHy")}>
              <input
                value={form.category_hy}
                onChange={(e) => setForm({ ...form, category_hy: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.colour")}>
              <input
                value={form.colour}
                onChange={(e) => setForm({ ...form, colour: e.target.value })}
                placeholder="Cream"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.colourEn")}>
              <input
                value={form.colour_en}
                onChange={(e) => setForm({ ...form, colour_en: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.colourHy")}>
              <input
                value={form.colour_hy}
                onChange={(e) => setForm({ ...form, colour_hy: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.aesthetic")}>
              <input
                value={form.aesthetic}
                onChange={(e) => setForm({ ...form, aesthetic: e.target.value })}
                placeholder="50's Style"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.family")}>
              <input
                value={form.family}
                onChange={(e) => setForm({ ...form, family: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.product.ean")}>
              <input
                value={form.ean}
                onChange={(e) =>
                  setForm(syncEanFieldToSpecs({ ...form, ean: e.target.value.replace(/[^0-9]/g, "") }))
                }
                inputMode="numeric"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.product.eanHint")}</p>
            </Field>
          </div>
          <ProductCollectionsEditor sku={sku} />
          <Field label={`${t("admin.product.price")}, ${t("admin.product.priceAmd")}`}>
            <input
              inputMode="numeric"
              value={form.price_amd}
              onChange={(e) => setForm({ ...form, price_amd: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label={`${t("admin.product.oldPrice")}, ${t("admin.product.oldPriceHint")}`}>
            <input
              inputMode="numeric"
              value={form.price_old}
              onChange={(e) => setForm({ ...form, price_old: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label={`${t("admin.product.discount")}, %`}>
            <input
              inputMode="numeric"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <div className="space-y-3 rounded-sm border border-border/60 bg-secondary/30 p-3">
            <p className="eyebrow text-muted-foreground">{t("admin.product.stockTitle")}</p>
            <Field label={t("admin.product.stockQty")}>
              <input
                inputMode="numeric"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {t("admin.product.stockReserved", {
                r: q.data.stock_reserved ?? 0,
                a: Math.max(0, (Number(form.stock_qty) || 0) - (q.data.stock_reserved ?? 0)),
              })}
            </p>
            <Field label={t("admin.product.leadTime")}>
              <input
                inputMode="numeric"
                placeholder={t("admin.product.leadExample")}
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {t("admin.product.availAuto")}{" "}
              <span className="font-medium text-foreground">
                {(Number(form.stock_qty) || 0) - (q.data.stock_reserved ?? 0) > 0
                  ? t("admin.product.availInStock")
                  : form.lead_time_days.trim()
                  ? t("admin.product.availPreOrder", { n: form.lead_time_days })
                  : t("admin.product.availOnRequest")}
              </span>
            </p>
          </div>
          <Field label={t("admin.product.badgeText")}>
            <input
              value={form.badge_text}
              maxLength={60}
              placeholder={t("admin.product.badgeExample")}
              onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <div className="space-y-2 rounded-sm border border-border/60 bg-secondary/30 p-3">
            <p className="eyebrow text-muted-foreground">{t("admin.product.showcase")}</p>
            {([
              ["is_published", "admin.product.showOnSite"],
              ["is_bestseller", "admin.products.bestseller"],
              ["is_new", "admin.products.newItem"],
              ["is_special_offer", "admin.products.special"],
              ["is_featured", "admin.product.featuredFull"],
            ] as const).map(([k, labelKey]) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form[k] as boolean}
                  onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                  className="h-4 w-4"
                />
                {t(labelKey)}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={save.isPending}
            className="w-full rounded-sm bg-foreground px-4 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? "..." : t("admin.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/admini/products" })}
            className="w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            {t("admin.cancel")}
          </button>
        </aside>
      </form>
    </div>
  );
}

function SpecsFields({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"ru" | "en" | "hy">("ru");
  const key = tab === "ru" ? "specs" : tab === "en" ? "specs_en" : "specs_hy";
  return (
    <div className="rounded-sm border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="eyebrow text-muted-foreground">{t("admin.product.specsTitle")}</p>
        <div className="flex gap-1 rounded-sm bg-secondary p-1 text-xs">
          {(["ru", "en", "hy"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={`rounded-sm px-3 py-1.5 uppercase tracking-[0.14em] ${tab === l ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t("admin.product.specsHint")}</p>
      <textarea
        value={form[key]}
        onChange={(e) => setForm(syncEanFromSpecsEdit(form, tab as SpecsLocale, e.target.value))}
        rows={12}
        className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function I18nContent({
  sku,
  form,
  setForm,
}: {
  sku: string;
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"ru" | "en" | "hy">("ru");

  const fields: Record<"ru" | "en" | "hy", { nameKey: keyof FormState; descKey: keyof FormState; labelKey: string }> = {
    ru: { nameKey: "name", descKey: "description", labelKey: "admin.content.langRu" },
    en: { nameKey: "name_en", descKey: "description_en", labelKey: "admin.content.langEn" },
    hy: { nameKey: "name_hy", descKey: "description_hy", labelKey: "admin.content.langHy" },
  };

  const f = fields[tab];

  return (
    <div className="rounded-sm border border-border p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-sm bg-secondary p-1 text-xs">
          {(Object.keys(fields) as Array<"ru" | "en" | "hy">).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-sm px-3 py-1.5 uppercase tracking-[0.14em] transition ${
                tab === k ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(fields[k].labelKey)}
            </button>
          ))}
        </div>
      </div>
      <Field label={t("admin.product.nameLang", { lang: t(f.labelKey) })}>
        <input
          value={form[f.nameKey] as string}
          maxLength={500}
          onChange={(e) => setForm({ ...form, [f.nameKey]: e.target.value })}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </Field>
      <div className="mt-4" />
      <Field label={t("admin.product.descLang", { lang: t(f.labelKey) })}>
        <textarea
          value={form[f.descKey] as string}
          onChange={(e) => setForm({ ...form, [f.descKey]: e.target.value })}
          rows={6}
          maxLength={10000}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </Field>
      {tab !== "ru" && !(form[f.nameKey] as string) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("admin.product.i18nFallback")}
        </p>
      )}
    </div>
  );
}

function ImageUploader({
  sku,
  onUploaded,
  label,
  multiple,
}: {
  sku: string;
  onUploaded: (url: string) => void;
  label: string;
  multiple?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(t("admin.product.notImageFile", { name: file.name }));
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(t("admin.product.fileTooBig", { name: file.name }));
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${sku}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage
          .from("product-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (sErr || !signed?.signedUrl) throw sErr ?? new Error(t("admin.product.uploadUrlError"));
        onUploaded(signed.signedUrl);
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
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}