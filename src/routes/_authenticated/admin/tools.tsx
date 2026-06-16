import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Percent, Loader2, Languages } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { countUntranslated, translateBatch } from "@/lib/translate.functions";

export const Route = createFileRoute("/_authenticated/admin/tools")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admin" });
  },
  component: AdminTools,
});

const EXPORT_COLS = [
  "sku",
  "name",
  "category",
  "brand",
  "family",
  "aesthetic",
  "colour",
  "ean",
  "price_amd",
  "price_old",
  "availability",
  "is_published",
  "is_bestseller",
  "is_new",
  "is_special_offer",
  "is_featured",
  "badge_text",
  "sort_weight",
] as const;

const UPDATABLE = new Set<string>([
  "name",
  "category",
  "brand",
  "family",
  "aesthetic",
  "colour",
  "ean",
  "price_amd",
  "price_old",
  "availability",
  "is_published",
  "is_bestseller",
  "is_new",
  "is_special_offer",
  "is_featured",
  "badge_text",
  "sort_weight",
]);

const BOOL_FIELDS = new Set([
  "is_published",
  "is_bestseller",
  "is_new",
  "is_special_offer",
  "is_featured",
]);
const NUM_FIELDS = new Set(["price_amd", "price_old", "sort_weight"]);

type Row = Record<string, unknown> & { sku?: unknown };

function AdminTools() {
  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-serif text-4xl">Инструменты</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Массовые операции с каталогом: экспорт, импорт, пересчёт цен.
        </p>
      </header>
      <ExportSection />
      <ImportSection />
      <BulkPriceSection />
      <BulkTranslateSection />
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border p-6">
      <h2 className="flex items-center gap-2 font-serif text-2xl">
        <Icon className="h-5 w-5" />
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

// ---------- EXPORT ----------
function ExportSection() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const all: Record<string, unknown>[] = [];
      const PAGE = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select(EXPORT_COLS.join(","))
          .order("sku", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const chunk = (data ?? []) as unknown as Record<string, unknown>[];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
      }
      const ws = XLSX.utils.json_to_sheet(all, { header: [...EXPORT_COLS] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "products");
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `smeg-catalog-${stamp}.xlsx`);
      toast.success(`Экспортировано ${all.length} товаров`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Экспорт каталога" icon={Download}>
      <p className="text-sm text-muted-foreground">
        Скачать весь каталог в XLSX — для бухгалтерии, маркетплейсов или редактирования.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-background disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Скачать XLSX
      </button>
    </Card>
  );
}

// ---------- IMPORT ----------
type DiffRow = { sku: string; changes: Record<string, { from: unknown; to: unknown }> };

function normalizeValue(field: string, raw: unknown): unknown {
  if (raw === "" || raw === undefined || raw === null) return null;
  if (BOOL_FIELDS.has(field)) {
    const s = String(raw).trim().toLowerCase();
    if (["1", "true", "yes", "да", "+"].includes(s)) return true;
    if (["0", "false", "no", "нет", "-"].includes(s)) return false;
    return Boolean(raw);
  }
  if (NUM_FIELDS.has(field)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return String(raw);
}

function ImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [diff, setDiff] = useState<DiffRow[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const qc = useQueryClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAnalyzing(true);
    setDiff(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      setRows(json);
      await analyze(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось прочитать файл");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function analyze(input: Row[]) {
    const skus = input.map((r) => String(r.sku ?? "").trim()).filter(Boolean);
    if (!skus.length) {
      toast.error("В файле не найдены SKU");
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select([...UPDATABLE, "sku"].join(","))
      .in("sku", skus);
    if (error) {
      toast.error(error.message);
      return;
    }
    const map = new Map<string, Record<string, unknown>>();
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
      map.set(String(r.sku), r);
    }
    const diffs: DiffRow[] = [];
    for (const row of input) {
      const sku = String(row.sku ?? "").trim();
      if (!sku) continue;
      const cur = map.get(sku);
      if (!cur) {
        diffs.push({ sku, changes: { __missing__: { from: null, to: "NEW SKU" } } });
        continue;
      }
      const changes: DiffRow["changes"] = {};
      for (const [k, raw] of Object.entries(row)) {
        if (k === "sku" || !UPDATABLE.has(k)) continue;
        if (raw === "" || raw === undefined) continue;
        const next = normalizeValue(k, raw);
        const prev = cur[k] ?? null;
        if (String(prev ?? "") !== String(next ?? "")) {
          changes[k] = { from: prev, to: next };
        }
      }
      if (Object.keys(changes).length) diffs.push({ sku, changes });
    }
    setDiff(diffs);
  }

  async function apply() {
    if (!rows || !diff) return;
    setApplying(true);
    try {
      const toApply = diff.filter((d) => !d.changes.__missing__);
      const rowsBySku = new Map(rows.map((r) => [String(r.sku).trim(), r]));
      let ok = 0;
      for (const d of toApply) {
        const src = rowsBySku.get(d.sku);
        if (!src) continue;
        const patch: Record<string, unknown> = {};
        for (const k of Object.keys(d.changes)) {
          patch[k] = normalizeValue(k, src[k]);
        }
        const { error } = await supabase.from("products").update(patch as never).eq("sku", d.sku);
        if (error) throw new Error(`${d.sku}: ${error.message}`);
        ok++;
      }
      toast.success(`Обновлено ${ok} товаров`);
      setRows(null);
      setDiff(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка применения");
    } finally {
      setApplying(false);
    }
  }

  const changedCount = diff?.filter((d) => !d.changes.__missing__).length ?? 0;
  const missingCount = diff?.filter((d) => d.changes.__missing__).length ?? 0;

  return (
    <Card title="Импорт XLSX (dry-run)" icon={Upload}>
      <p className="text-sm text-muted-foreground">
        Загрузите XLSX с колонкой <code className="font-mono">sku</code> + любыми из:{" "}
        <span className="font-mono text-xs">{Array.from(UPDATABLE).join(", ")}</span>. Пустые ячейки игнорируются.
      </p>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onFile}
          className="block w-full text-sm file:mr-4 file:rounded-sm file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.15em] file:text-background"
        />
      </div>
      {analyzing && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Анализ…
        </p>
      )}
      {diff && (
        <div className="space-y-3">
          <div className="text-sm">
            Готово к применению: <b>{changedCount}</b>. Без изменений:{" "}
            <b>{(rows?.length ?? 0) - changedCount - missingCount}</b>.{" "}
            {missingCount > 0 && (
              <span className="text-amber-600">Не найдено SKU: <b>{missingCount}</b> (будут пропущены).</span>
            )}
          </div>
          {diff.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-sm border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Изменения</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.slice(0, 200).map((d) => (
                    <tr key={d.sku} className="border-t border-border align-top">
                      <td className="p-2 font-mono">{d.sku}</td>
                      <td className="p-2">
                        {Object.entries(d.changes).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-mono text-muted-foreground">{k}:</span>{" "}
                            <span className="line-through opacity-60">{String(v.from ?? "—")}</span>{" "}
                            → <b>{String(v.to ?? "—")}</b>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {diff.length > 200 && (
                <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
                  …ещё {diff.length - 200} строк
                </div>
              )}
            </div>
          )}
          <button
            onClick={apply}
            disabled={applying || changedCount === 0}
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-background disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Применить ({changedCount})
          </button>
        </div>
      )}
    </Card>
  );
}

// ---------- BULK PRICE ----------
function BulkPriceSection() {
  const [scope, setScope] = useState<"all" | "category" | "family">("category");
  const [value, setValue] = useState("");
  const [percent, setPercent] = useState("5");
  const [mode, setMode] = useState<"increase" | "decrease" | "set_discount">("increase");
  const [roundTo, setRoundTo] = useState("100");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const cats = useQuery({
    queryKey: ["distinct-cats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category,family")
        .limit(5000);
      if (error) throw error;
      const c = new Set<string>();
      const f = new Set<string>();
      for (const r of (data ?? []) as Array<{ category: string | null; family: string | null }>) {
        if (r.category) c.add(r.category);
        if (r.family) f.add(r.family);
      }
      return { categories: Array.from(c).sort(), families: Array.from(f).sort() };
    },
  });

  const preview = useMutation({
    mutationFn: async () => {
      let q = supabase.from("products").select("sku,name,price_amd,price_old");
      if (scope === "category" && value) q = q.eq("category", value);
      else if (scope === "family" && value) q = q.eq("family", value);
      q = q.not("price_amd", "is", null).limit(1000);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const pct = Number(percent) || 0;
  const round = Math.max(1, Number(roundTo) || 1);

  function newPrice(curr: number): { price: number; old: number | null } {
    if (mode === "increase") {
      const p = Math.round((curr * (1 + pct / 100)) / round) * round;
      return { price: p, old: null };
    }
    if (mode === "decrease") {
      const p = Math.round((curr * (1 - pct / 100)) / round) * round;
      return { price: p, old: null };
    }
    // set_discount: keep price as old, set new lower price
    const p = Math.round((curr * (1 - pct / 100)) / round) * round;
    return { price: p, old: curr };
  }

  async function apply() {
    const items = preview.data;
    if (!items?.length) {
      toast.error("Сначала нажмите «Посмотреть»");
      return;
    }
    if (!confirm(`Применить к ${items.length} товарам?`)) return;
    setBusy(true);
    try {
      let ok = 0;
      for (const it of items as Array<{ sku: string; price_amd: number | null }>) {
        if (it.price_amd == null) continue;
        const np = newPrice(it.price_amd);
        const patch: Record<string, unknown> = { price_amd: np.price };
        if (mode === "set_discount") patch.price_old = np.old;
        const { error } = await supabase.from("products").update(patch as never).eq("sku", it.sku);
        if (error) throw error;
        ok++;
      }
      toast.success(`Обновлено ${ok} цен`);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      preview.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Массовое изменение цен" icon={Percent}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Область</span>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as typeof scope);
              setValue("");
            }}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          >
            <option value="category">По категории</option>
            <option value="family">По линейке</option>
            <option value="all">Все товары</option>
          </select>
        </label>
        {scope !== "all" && (
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Значение</span>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
            >
              <option value="">— выбрать —</option>
              {(scope === "category" ? cats.data?.categories : cats.data?.families)?.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Операция</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          >
            <option value="increase">Поднять на %</option>
            <option value="decrease">Снизить на %</option>
            <option value="set_discount">Сделать акцию (старая цена → было)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Процент</span>
          <input
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Округлять до, ֏</span>
          <input
            type="number"
            value={roundTo}
            onChange={(e) => setRoundTo(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => preview.mutate()}
          disabled={preview.isPending || (scope !== "all" && !value)}
          className="rounded-sm border border-border px-5 py-2.5 text-sm uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
        >
          Посмотреть
        </button>
        <button
          onClick={apply}
          disabled={busy || !preview.data?.length}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-background disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Применить
        </button>
      </div>
      {preview.data && (
        <div className="max-h-80 overflow-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-2">SKU</th>
                <th className="p-2">Название</th>
                <th className="p-2 text-right">Было</th>
                <th className="p-2 text-right">Станет</th>
              </tr>
            </thead>
            <tbody>
              {(preview.data as Array<{ sku: string; name: string; price_amd: number | null }>)
                .slice(0, 200)
                .map((it) => {
                  const np = it.price_amd != null ? newPrice(it.price_amd) : null;
                  return (
                    <tr key={it.sku} className="border-t border-border">
                      <td className="p-2 font-mono">{it.sku}</td>
                      <td className="p-2">{it.name}</td>
                      <td className="p-2 text-right">{it.price_amd?.toLocaleString("ru-RU")}</td>
                      <td className="p-2 text-right font-semibold">
                        {np?.price.toLocaleString("ru-RU")}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {preview.data.length > 200 && (
            <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
              …ещё {preview.data.length - 200} строк
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BulkTranslateSection() {
  const countFn = useServerFn(countUntranslated);
  const batchFn = useServerFn(translateBatch);
  const [stats, setStats] = useState<{ total: number; needs_en: number; needs_hy: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [stopFlag, setStopFlag] = useState(false);

  async function refresh() {
    try {
      const s = await countFn({});
      setStats(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function run() {
    setBusy(true);
    setStopFlag(false);
    setLog([]);
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (stopFlag) break;
        const r = await batchFn({ data: { limit: 5 } });
        if (r.processed === 0) {
          setLog((l) => [...l, "✓ Готово — нечего переводить"]);
          break;
        }
        for (const it of r.results) {
          setLog((l) => [...l, it.ok ? `✓ ${it.sku}` : `✗ ${it.sku}: ${it.error}`]);
        }
        await refresh();
      }
      toast.success("Перевод завершён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="AI-перевод каталога (RU → EN + HY)" icon={Languages}>
      <p className="text-sm text-muted-foreground">
        Перевод названий, описаний, категорий, цветов и характеристик через ИИ. Бренды
        (Smeg, Dolce&nbsp;&amp;&nbsp;Gabbana, Blu&nbsp;Mediterraneo, Porsche, Coca-Cola и т.д.) и
        модельные коды не переводятся.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={refresh}
          className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] hover:border-foreground"
        >
          Обновить статистику
        </button>
        {!busy ? (
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.14em] text-background"
          >
            ✦ Перевести всё, что не переведено
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStopFlag(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.14em]"
          >
            <Loader2 className="h-3 w-3 animate-spin" /> Остановить
          </button>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Всего товаров" value={stats.total} />
          <Stat label="Без английского" value={stats.needs_en} warn={stats.needs_en > 0} />
          <Stat label="Без армянского" value={stats.needs_hy} warn={stats.needs_hy > 0} />
        </div>
      )}
      {log.length > 0 && (
        <div className="max-h-60 overflow-auto rounded-sm border border-border bg-secondary/30 p-3 font-mono text-xs">
          {log.slice(-200).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Совет: запустите фоном — переводы идут пачками по 5 SKU, каждая ~10–20 секунд.
      </p>
    </Card>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${warn ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}