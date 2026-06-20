#!/usr/bin/env node
/**
 * Apply filled spec-keys.csv + spec-values.csv to all products missing specs_hy.
 *
 *   node import-specs-dictionary.mjs spec-keys.csv spec-values.csv
 */
import { readFileSync } from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const files = args.filter((a) => !a.startsWith("--"));
const [keysFile, valsFile] = files;
if (!keysFile || !valsFile) {
  console.error("Usage: node import-specs-dictionary.mjs spec-keys.csv spec-values.csv [--force]");
  process.exit(1);
}

async function api(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
    },
  });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
  });
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function loadCsv(path) {
  return parseCsv(readFileSync(path, "utf8"));
}

const DICT = {
  Black: ["Черный", "Սև"],
  White: ["Белый", "Սպիտակ"],
  Cream: ["Кремовый", "Կրեմագույն"],
  Red: ["Красный", "Կարմիր"],
  Steel: ["Сталь", "Պողպատ"],
  "Stainless steel": ["Нержавеющая сталь", "Չժանգոտվող պողպատ"],
  Yes: ["Да", "Այո"],
  No: ["Нет", "Ոչ"],
};

function applyMaps(specsEn, keyRu, keyHy, valRu, valHy) {
  const ru = {};
  const hy = {};
  for (const [k, v] of Object.entries(specsEn)) {
    const tkRu = keyRu[k] || k;
    const tkHy = keyHy[k] || k;
    const d = DICT[v];
    ru[tkRu] = d ? d[0] : (valRu[v] ?? v);
    hy[tkHy] = d ? d[1] : (valHy[v] ?? v);
  }
  return { ru, hy };
}

async function main() {
  const keyRows = loadCsv(keysFile);
  const valRows = loadCsv(valsFile);
  const keyRu = Object.fromEntries(keyRows.map((r) => [r.key_en, r.key_ru || r.key_en]));
  const keyHy = Object.fromEntries(keyRows.map((r) => [r.key_en, r.key_hy || r.key_en]));
  const valRu = Object.fromEntries(valRows.map((r) => [r.value_en, r.value_ru ?? r.value_en]));
  const valHy = Object.fromEntries(valRows.map((r) => [r.value_en, r.value_hy ?? r.value_en]));

  const filter = force
    ? "specs_en=not.is.null"
    : "specs_hy=is.null&specs_en=not.is.null";
  const rows = await api(`products?select=sku,specs_en,specs_hy&${filter}&limit=5000`);
  console.log(`Importing to ${rows.length} products${force ? " (force)" : ""}...`);

  let i = 0;
  for (const r of rows) {
    i++;
    const en = r.specs_en || {};
    if (!Object.keys(en).length) continue;
    const { ru, hy } = applyMaps(en, keyRu, keyHy, valRu, valHy);
    await api(`products?sku=eq.${encodeURIComponent(r.sku)}`, {
      method: "PATCH",
      body: JSON.stringify({
        specs: ru,
        specs_hy: hy,
        translated_at: new Date().toISOString(),
      }),
      prefer: "return=minimal",
    });
    if (i % 100 === 0) console.log(`  ${i}/${rows.length}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
