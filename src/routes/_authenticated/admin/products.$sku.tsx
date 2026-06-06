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
  discount_percent: string;
  availability: string;
  is_published: boolean;
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
        discount_percent: q.data.discount_percent?.toString() ?? "0",
        availability: q.data.availability ?? "on_request",
        is_published: !!q.data.is_published,
        main_image: q.data.main_image ?? "",
        images: (q.data.images ?? []).join("\n"),
      });
    }
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const price = f.price_amd.trim() ? parseInt(f.price_amd, 10) : null;
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
          discount_percent: disc,
          availability: f.availability,
          is_published: f.is_published,
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
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="h-4 w-4"
            />
            Показывать на сайте
          </label>

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