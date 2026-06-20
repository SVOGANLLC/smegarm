#!/usr/bin/env node
/**
 * Export unique spec keys & values still needed for manual translation.
 * Output: CSV files ready for Excel / Google Sheets.
 *
 *   node export-untranslated-dictionary.mjs
 *
 * Import filled files back:
 *   node import-specs-dictionary.mjs spec-keys.csv spec-values.csv
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUT = process.env.EXPORT_DIR || join(dirname(fileURLToPath(import.meta.url)), "export");
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function api(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function writeCsv(path, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  writeFileSync(path, "\uFEFF" + lines.join("\n"), "utf8");
}

function needsValueTranslation(val) {
  if (!val || val.length < 2) return false;
  if (/^[0-9 .,/%°()\-–—+]+$/.test(val)) return false;
  if (/^\d+\s*(mm|cm|kg|W|kW|Hz|V|A|L|l)\b/i.test(val)) return false;
  if (!/[A-Za-z]{3}/.test(val)) return false;
  return true;
}

/** Learn EN→RU/HY from already-translated products (537 rows). */
function learnFromTranslated(rows) {
  const keyRu = new Map();
  const keyHy = new Map();
  const valRu = new Map();
  const valHy = new Map();

  for (const r of rows) {
    const en = r.specs_en || {};
    const ru = r.specs || {};
    const hy = r.specs_hy || {};
    const enKeys = Object.keys(en);
    const ruKeys = Object.keys(ru);
    const hyKeys = Object.keys(hy);
    if (enKeys.length !== ruKeys.length || enKeys.length !== hyKeys.length) continue;
    for (let i = 0; i < enKeys.length; i++) {
      const ek = enKeys[i];
      const ev = en[ek];
      const rk = ruKeys[i];
      const rv = ru[rk];
      const hk = hyKeys[i];
      const hv = hy[hyKeys[i]];
      if (ek && rk && ek !== rk) keyRu.set(ek, rk);
      if (ek && hk && ek !== hk) keyHy.set(ek, hk);
      if (ev && rv && ev !== rv) valRu.set(ev, rv);
      if (ev && hv && ev !== hv) valHy.set(ev, hv);
    }
  }
  return { keyRu, keyHy, valRu, valHy };
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const pending = await api(
    "products?select=sku,specs_en,specs,specs_hy&specs_hy=is.null&specs_en=not.is.null&limit=5000",
  );
  const done = await api(
    "products?select=specs_en,specs,specs_hy&specs_hy=not.is.null&limit=5000",
  );
  const learned = learnFromTranslated(done.filter((r) => r.specs_hy && Object.keys(r.specs_hy).length));

  const keys = new Set();
  const vals = new Set();
  for (const r of pending) {
    const en = r.specs_en || {};
    for (const [k, v] of Object.entries(en)) {
      keys.add(k);
      if (needsValueTranslation(v)) vals.add(v);
    }
  }

  const keyRows = [...keys].sort().map((en) => [
    en,
    learned.keyRu.get(en) || "",
    learned.keyHy.get(en) || "",
  ]);
  const valRows = [...vals].sort().map((en) => [
    en,
    learned.valRu.get(en) || "",
    learned.valHy.get(en) || "",
  ]);

  const keysPath = join(OUT, "spec-keys.csv");
  const valsPath = join(OUT, "spec-values.csv");
  writeCsv(keysPath, ["key_en", "key_ru", "key_hy"], keyRows);
  writeCsv(valsPath, ["value_en", "value_ru", "value_hy"], valRows);

  const keysNeed = keyRows.filter((r) => !r[1] || !r[2]).length;
  const valsNeed = valRows.filter((r) => !r[1] || !r[2]).length;

  writeFileSync(
    join(OUT, "README.txt"),
    `Smeg — словарь для ручного перевода характеристик
================================================

Файлы:
  spec-keys.csv    — ${keyRows.length} уникальных НАЗВАНИЙ полей (Width, Colour, …)
  spec-values.csv  — ${valRows.length} уникальных ТЕКСТОВЫХ значений (Black, Yes, …)

Уже подставлено из переведённых товаров (537 шт.):
  ключей: ${keyRows.length - keysNeed} / ${keyRows.length}
  значений: ${valRows.length - valsNeed} / ${valRows.length}

Как заполнять:
  1. Откройте CSV в Excel или Google Таблицах.
  2. Заполните пустые key_ru / key_hy и value_ru / value_hy.
  3. НЕ меняйте колонки *_en. Не удаляйте строки.
  4. Числа, mm, W, SKU — в value_en обычно оставляем как есть в ru/hy.
  5. Бренды не переводим: Smeg, Dolce & Gabbana, Porsche, FAB28, …

После заполнения пришлите оба CSV — импортируем на сайт (~1406 товаров).

Товары без specs_hy: ${pending.length}
`,
    "utf8",
  );

  console.log(`Exported to ${OUT}/`);
  console.log(`  spec-keys.csv:   ${keyRows.length} rows (${keysNeed} need translation)`);
  console.log(`  spec-values.csv: ${valRows.length} rows (${valsNeed} need translation)`);
  console.log(`  products pending: ${pending.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
