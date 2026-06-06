import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products/$sku")({
  component: EditProduct,
});

type FormState = {
  name: string;
  description: string;
  price_amd: string;
  price_old: string;
  discount_percent: string;
  availability: string;
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
};

function EditProduct() {
  const { sku } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const q = useQuery({
    queryKey: ["admin-product", sku],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("sku", sku).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (q.data && !form) {
      setForm({
        name: q.data.name ?? "",
        description: q.data.description ?? "",
        price_amd: q.data.price_amd?.toString() ?? "",
        price_old: q.data.price_old?.toString() ?? "",
        discount_percent: q.data.discount_percent?.toString() ?? "0",
        availability: q.data.availability ?? "on_request",
        is_published: !!q.data.is_published,
        is_featured: !!q.data.is_featured,
        is_new: !!q.data.is_new,
        is_bestseller: !!q.data.is_bestseller,
        is_special_offer: !!q.data.is_special_offer,
        badge_text: q.data.badge_text ?? "",
        seo_title: q.data.seo_title ?? "",
        seo_description: q.data.seo_description ?? "",
        main_image: q.data.main_image ?? "",
        images: (q.data.images ?? []).join("\n"),
      });
    }
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const price = f.price_amd.trim() ? parseInt(f.price_amd, 10) : null;
      const priceOld = f.price_old.trim() ? parseInt(f.price_old, 10) : null;
      const disc = Math.max(0, Math.min(90, parseInt(f.discount_percent, 10) || 0));
      if (price !== null && (isNaN(price) || price < 0)) throw new Error("Цена должна быть числом");
      const images = f.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("products")
        .update({
          name: f.name.trim().slice(0, 500),
          description: f.description.slice(0, 10000),
          price_amd: price,
          price_old: priceOld,
          discount_percent: disc,
          availability: f.availability,
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
        })
        .eq("sku", sku);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", sku] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["product", sku] });
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  if (q.isLoading || !form) return <div className="text-sm text-muted-foreground">Загрузка…</div>;
  if (!q.data) return <div>Не найдено</div>;

  return (
    <div>
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> К списку
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
          Открыть на сайте ↗
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
        className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <Field label="Название">
            <input
              value={form.name}
              maxLength={500}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Описание (HTML)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              maxLength={10000}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Главное фото (URL)">
            <input
              value={form.main_image}
              onChange={(e) => setForm({ ...form, main_image: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Галерея — по одному URL на строку">
            <textarea
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
              rows={6}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
            />
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
        </div>

        <aside className="space-y-6 rounded-sm border border-border p-6">
          <Field label="Цена, ֏ (AMD)">
            <input
              inputMode="numeric"
              value={form.price_amd}
              onChange={(e) => setForm({ ...form, price_amd: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Старая цена, ֏ (зачёркнутая)">
            <input
              inputMode="numeric"
              value={form.price_old}
              onChange={(e) => setForm({ ...form, price_old: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Скидка, %">
            <input
              inputMode="numeric"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value.replace(/[^0-9]/g, "") })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Наличие">
            <select
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              <option value="in_stock">В наличии</option>
              <option value="pre_order">Под заказ</option>
              <option value="out_of_stock">Нет</option>
              <option value="on_request">По запросу</option>
            </select>
          </Field>
          <Field label="Текст бейджа (плашка)">
            <input
              value={form.badge_text}
              maxLength={60}
              placeholder="напр. -20%, Premium"
              onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <div className="space-y-2 rounded-sm border border-border/60 bg-secondary/30 p-3">
            <p className="eyebrow text-muted-foreground">Витрина</p>
            {([
              ["is_published", "Показывать на сайте"],
              ["is_bestseller", "Хит продаж"],
              ["is_new", "Новинка"],
              ["is_special_offer", "Спецпредложение"],
              ["is_featured", "На главную (Featured)"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form[k] as boolean}
                  onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={save.isPending}
            className="w-full rounded-sm bg-foreground px-4 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? "..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/products" })}
            className="w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Отмена
          </button>
        </aside>
      </form>
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