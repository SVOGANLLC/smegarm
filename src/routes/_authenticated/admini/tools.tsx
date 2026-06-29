import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Percent, Loader2, Languages, Type } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { countUntranslated, translateBatch } from "@/lib/translate.functions";
import { fixHyMixedScript, hasHyMixedScript } from "@/lib/hy-script";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admini/tools")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: AdminTools,
});

const CATALOG_COLUMNS = [
  { key: "sku", header: "SKU" },
  { key: "name", header: "Название" },
  { key: "category", header: "Категория" },
  { key: "brand", header: "Бренд" },
  { key: "family", header: "Линейка" },
  { key: "aesthetic", header: "Эстетика" },
  { key: "colour", header: "Цвет" },
  { key: "ean", header: "EAN" },
  { key: "price_amd", header: "Цена (AMD)" },
  { key: "price_old", header: "Старая цена (AMD)" },
  { key: "discount_percent", header: "Скидка %" },
  { key: "stock_qty", header: "Количество (остаток шт.)" },
  { key: "availability", header: "Наличие" },
  { key: "is_published", header: "Опубликован" },
  { key: "is_bestseller", header: "Хит" },
  { key: "is_new", header: "Новинка" },
  { key: "is_special_offer", header: "Акция" },
  { key: "is_featured", header: "На главной" },
  { key: "badge_text", header: "Бейдж" },
  { key: "sort_weight", header: "Сортировка" },
] as const;

const EXPORT_COLS = CATALOG_COLUMNS.map((c) => c.key);
const EXPORT_HEADERS = CATALOG_COLUMNS.map((c) => c.header);

/** Map Excel header (RU or technical key) → DB field name. */
const HEADER_TO_FIELD = Object.fromEntries(
  CATALOG_COLUMNS.flatMap((c) => [
    [c.header, c.key],
    [c.key, c.key],
  ]),
) as Record<string, string>;

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
  "discount_percent",
  "stock_qty",
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
const NUM_FIELDS = new Set(["price_amd", "price_old", "discount_percent", "stock_qty", "sort_weight"]);

function remapImportRow(raw: Row): Row {
  const out: Row = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = HEADER_TO_FIELD[header.trim()];
    if (field) out[field] = value;
  }
  return out;
}

function rowForExport(dbRow: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, header } of CATALOG_COLUMNS) {
    out[header] = dbRow[key] ?? "";
  }
  return out;
}

type Row = Record<string, unknown> & { sku?: unknown };

function AdminTools() {
  const { t } = useI18n();
  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-serif text-4xl">{t("admin.tools.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("admin.tools.desc")}
        </p>
      </header>
      <ExportSection />
      <ImportSection />
      <BulkPriceSection />
      <BulkTranslateSection />
      <HyScriptSection />
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
  const { t } = useI18n();
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
      const ws = XLSX.utils.json_to_sheet(all.map(rowForExport), { header: EXPORT_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "products");
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `smeg-catalog-${stamp}.xlsx`);
      toast.success(t("admin.tools.exported", { n: all.length }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.orders.exportError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("admin.tools.exportTitle")} icon={Download}>
      <p className="text-sm text-muted-foreground">
        {t("admin.tools.exportDesc")}
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-background disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {t("admin.tools.downloadXlsx")}
      </button>
    </Card>
  );
}

// ---------- IMPORT ----------
type DiffRow = { sku: string; changes: Record<string, { from: unknown; to: unknown }> };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchProductsBySkus(skus: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const cols = [...UPDATABLE, "sku"].join(",");
  for (const batch of chunk(skus, 120)) {
    const { data, error } = await supabase.from("products").select(cols).in("sku", batch);
    if (error) throw error;
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
      map.set(String(r.sku), r);
    }
  }
  return map;
}

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
    if (!Number.isFinite(n)) return null;
    if (field === "discount_percent") return Math.max(0, Math.min(90, Math.round(n)));
    if (field === "stock_qty") return Math.max(0, Math.round(n));
    return n;
  }
  return String(raw);
}

function ImportSection() {
  const { t } = useI18n();
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
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" }).map(remapImportRow);
      setRows(json);
      await analyze(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.tools.readError"));
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function analyze(input: Row[]) {
    const skus = input.map((r) => String(r.sku ?? "").trim()).filter(Boolean);
    if (!skus.length) {
      toast.error(t("admin.tools.noSku"));
      return;
    }
    let map: Map<string, Record<string, unknown>>;
    try {
      map = await fetchProductsBySkus(skus);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.tools.readError"));
      return;
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
    if (!diffs.length) {
      toast.message(t("admin.tools.noChanges"));
    }
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
      toast.success(t("admin.tools.updatedProducts", { n: ok }));
      setRows(null);
      setDiff(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.tools.applyError"));
    } finally {
      setApplying(false);
    }
  }

  const changedCount = diff?.filter((d) => !d.changes.__missing__).length ?? 0;
  const missingCount = diff?.filter((d) => d.changes.__missing__).length ?? 0;

  return (
    <Card title={t("admin.tools.importTitle")} icon={Upload}>
      <p className="text-sm text-muted-foreground">
        {t("admin.tools.importDesc")}{" "}
        <span className="font-mono text-xs">{EXPORT_HEADERS.join(", ")}</span>
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
          {t("admin.tools.analyzing")}
        </p>
      )}
      {diff && (
        <div className="space-y-3">
          <div className="text-sm">
            {t("admin.tools.readyApply")} <b>{changedCount}</b>. {t("admin.tools.unchanged")}{" "}
            <b>{(rows?.length ?? 0) - changedCount - missingCount}</b>.{" "}
            {missingCount > 0 && (
              <span className="text-amber-600">{t("admin.tools.missingSku", { n: missingCount })}</span>
            )}
          </div>
          {diff.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-sm border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="p-2">SKU</th>
                    <th className="p-2">{t("admin.tools.changes")}</th>
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
                  {t("admin.tools.moreRows", { n: diff.length - 200 })}
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
            {t("admin.tools.applyCount", { n: changedCount })}
          </button>
        </div>
      )}
    </Card>
  );
}

// ---------- BULK PRICE ----------
function BulkPriceSection() {
  const { t } = useI18n();
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
      toast.error(t("admin.tools.previewFirst"));
      return;
    }
    if (!confirm(t("admin.tools.applyConfirm", { n: items.length }))) return;
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
      toast.success(t("admin.tools.pricesUpdated", { n: ok }));
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      preview.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("admin.tools.pricesTitle")} icon={Percent}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.tools.scope")}</span>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as typeof scope);
              setValue("");
            }}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          >
            <option value="category">{t("admin.tools.scopeCategory")}</option>
            <option value="family">{t("admin.tools.scopeFamily")}</option>
            <option value="all">{t("admin.tools.scopeAll")}</option>
          </select>
        </label>
        {scope !== "all" && (
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.tools.value")}</span>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
            >
              <option value="">{t("admin.tools.select")}</option>
              {(scope === "category" ? cats.data?.categories : cats.data?.families)?.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.tools.operation")}</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          >
            <option value="increase">{t("admin.tools.increase")}</option>
            <option value="decrease">{t("admin.tools.decrease")}</option>
            <option value="set_discount">{t("admin.tools.setDiscount")}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.tools.percent")}</span>
          <input
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.tools.roundTo")}</span>
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
          {t("admin.tools.preview")}
        </button>
        <button
          onClick={apply}
          disabled={busy || !preview.data?.length}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-background disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("admin.tools.apply")}
        </button>
      </div>
      {preview.data && (
        <div className="max-h-80 overflow-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-2">SKU</th>
                <th className="p-2">{t("admin.products.nameLabel")}</th>
                <th className="p-2 text-right">{t("admin.tools.colWas")}</th>
                <th className="p-2 text-right">{t("admin.tools.colWill")}</th>
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
              {t("admin.tools.moreRows", { n: preview.data.length - 200 })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BulkTranslateSection() {
  const { t } = useI18n();
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
      toast.error(e instanceof Error ? e.message : t("admin.error"));
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
          setLog((l) => [...l, t("admin.tools.nothingToTranslate")]);
          break;
        }
        for (const it of r.results) {
          setLog((l) => [...l, it.ok ? `✓ ${it.sku}` : `✗ ${it.sku}: ${it.error}`]);
        }
        await refresh();
      }
      toast.success(t("admin.tools.translateDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("admin.tools.translateTitle")} icon={Languages}>
      <p className="text-sm text-muted-foreground">
        {t("admin.tools.translateDesc")}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={refresh}
          className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] hover:border-foreground"
        >
          {t("admin.tools.refreshStats")}
        </button>
        {!busy ? (
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.14em] text-background"
          >
            {t("admin.tools.translateAll")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStopFlag(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.14em]"
          >
            <Loader2 className="h-3 w-3 animate-spin" /> {t("admin.tools.stop")}
          </button>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat label={t("admin.tools.statTotal")} value={stats.total} />
          <Stat label={t("admin.tools.statNoEn")} value={stats.needs_en} warn={stats.needs_en > 0} />
          <Stat label={t("admin.tools.statNoHy")} value={stats.needs_hy} warn={stats.needs_hy > 0} />
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
        {t("admin.tools.translateTip")}
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

type HyIssue = { sku: string; field: string; before: string; after: string };

function HyScriptSection() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<HyIssue[]>([]);

  async function scan() {
    setBusy(true);
    try {
      const found: HyIssue[] = [];
      const PAGE = 500;
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("products")
          .select("sku,name_hy,description_hy,category_hy,colour_hy")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        for (const row of data) {
          for (const field of ["name_hy", "description_hy", "category_hy", "colour_hy"] as const) {
            const before = row[field];
            if (!hasHyMixedScript(before)) continue;
            const after = fixHyMixedScript(before);
            if (after !== before) found.push({ sku: row.sku, field, before: before!, after });
          }
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setIssues(found);
      toast.success(
        found.length ? t("admin.tools.hyScriptFound", { n: found.length }) : t("admin.tools.hyScriptNone"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!issues.length) return;
    setBusy(true);
    try {
      let fixed = 0;
      for (const issue of issues) {
        const { error } = await supabase
          .from("products")
          .update({ [issue.field]: issue.after })
          .eq("sku", issue.sku);
        if (error) throw error;
        fixed += 1;
      }
      setIssues([]);
      toast.success(t("admin.tools.hyScriptDone", { n: fixed }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("admin.tools.hyScriptTitle")} icon={Type}>
      <p className="text-sm text-muted-foreground">{t("admin.tools.hyScriptDesc")}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={scan}
          className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-50"
        >
          {busy ? t("admin.tools.analyzing") : t("admin.tools.hyScriptScan")}
        </button>
        {issues.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={apply}
            className="rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.14em] text-background disabled:opacity-50"
          >
            {t("admin.tools.hyScriptApply", { n: issues.length })}
          </button>
        )}
      </div>
      {issues.length > 0 && (
        <div className="max-h-60 overflow-auto rounded-sm border border-border bg-secondary/30 p-3 font-mono text-xs">
          {issues.slice(0, 120).map((row, i) => (
            <div key={`${row.sku}-${row.field}-${i}`} className="border-b border-border/50 py-1 last:border-0">
              <span className="text-muted-foreground">{row.sku}</span> · {row.field}
              <div className="text-rose-700 line-through">{row.before}</div>
              <div className="text-emerald-700">{row.after}</div>
            </div>
          ))}
          {issues.length > 120 && (
            <p className="mt-2 text-muted-foreground">{t("admin.tools.moreRows", { n: issues.length - 120 })}</p>
          )}
        </div>
      )}
    </Card>
  );
}