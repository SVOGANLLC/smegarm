#!/usr/bin/env node
/**
 * One-time bulk fill of product descriptions and specs (EN → RU base + HY).
 * Uses Google Translate (client=gtx) with on-disk cache. Re-run safe: skips rows
 * that already have description_hy / specs_hy unless --overwrite.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dir, ".translate-cache.json");
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS || 400);

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const descriptionsOnly = args.has("--descriptions-only");
const specsOnly = args.has("--specs-only");
const overwrite = args.has("--overwrite");

async function api(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let cache = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}
function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));
}

async function translateText(text, targetLang) {
  const k = `${targetLang}::${text}`;
  if (cache[k]) return cache[k];
  if (!text.trim()) return text;

  const chunks = [];
  let rest = text;
  while (rest.length > 4500) {
    const cut = rest.lastIndexOf(". ", 4500);
    const at = cut > 500 ? cut + 1 : 4500;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) chunks.push(rest);

  const out = [];
  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
    let lastErr;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        out.push(j[0].map((x) => x[0]).join(""));
        lastErr = null;
        break;
      }
      lastErr = new Error(`translate ${r.status}`);
      const wait = DELAY_MS * (attempt + 1) * 3;
      console.warn(`  retry ${attempt + 1} (${r.status}) wait ${wait}ms`);
      await sleep(wait);
    }
    if (lastErr) throw lastErr;
    await sleep(DELAY_MS);
  }
  const result = out.join("");
  cache[k] = result;
  if (Object.keys(cache).length % 50 === 0) saveCache();
  return result;
}

const DICT_VALUES = {
  Black: ["Черный", "Սև"],
  White: ["Белый", "Սպիտակ"],
  Cream: ["Кремовый", "Կրեմագույն"],
  Red: ["Красный", "Կարմիր"],
  Steel: ["Сталь", "Պողպատ"],
  "Stainless steel": ["Нержавеющая сталь", "Չժանգոտվող պողպատ"],
  Yes: ["Да", "Այո"],
  No: ["Нет", "Ոչ"],
};

function dictValue(val, lang) {
  const d = DICT_VALUES[val];
  if (d) return lang === "ru" ? d[0] : d[1];
  return null;
}

function needsValueTranslation(val) {
  if (!val || val.length < 2) return false;
  if (/^[0-9 .,/%°()\-–—+]+$/.test(val)) return false;
  if (/^\d+\s*(mm|cm|kg|W|kW|Hz|V|A|L|l)\b/i.test(val)) return false;
  if (/^[A-Z]{2,}\d/.test(val)) return false;
  if (!/[A-Za-z]{3}/.test(val)) return false;
  return true;
}

function applySpecMaps(specsEn, keyRu, keyHy, valRu, valHy) {
  const ru = {};
  const hy = {};
  for (const [k, v] of Object.entries(specsEn)) {
    const tkRu = keyRu[k] ?? k;
    const tkHy = keyHy[k] ?? k;
    let vRu = dictValue(v, "ru");
    let vHy = dictValue(v, "hy");
    if (!vRu) vRu = valRu[v] ?? v;
    if (!vHy) vHy = valHy[v] ?? v;
    ru[tkRu] = vRu;
    hy[tkHy] = vHy;
  }
  return { ru, hy };
}

async function buildMaps(strings, langs) {
  const maps = Object.fromEntries(langs.map((l) => [l, {}]));
  let i = 0;
  for (const s of strings) {
    i++;
    for (const lang of langs) {
      maps[lang][s] = await translateText(s, lang);
    }
    if (i % 100 === 0) {
      saveCache();
      console.log(`  dictionary ${i}/${strings.size}`);
    }
  }
  return maps;
}

async function fillDescriptions() {
  console.log("\n=== Descriptions ===");
  const filter = overwrite
    ? "select=sku,description_en,description,description_hy&description_en=not.is.null"
    : "select=sku,description_en,description,description_hy&description_hy=is.null&description_en=not.is.null";
  const rows = await api(`products?${filter}&limit=5000`);
  console.log(`Products to process: ${rows.length}`);
  if (!rows.length) return;

  const byText = new Map();
  for (const r of rows) {
    const en = (r.description_en || r.description || "").trim();
    if (!en) continue;
    if (!byText.has(en)) byText.set(en, []);
    byText.get(en).push(r.sku);
  }
  console.log(`Unique descriptions: ${byText.size}`);

  let i = 0;
  for (const [en, skus] of byText) {
    i++;
    const ru = await translateText(en, "ru");
    const hy = await translateText(en, "hy");
    const skuFilter = skus.map((s) => `sku.eq.${encodeURIComponent(s)}`).join(",");
    await api(`products?or=(${skuFilter})`, {
      method: "PATCH",
      body: JSON.stringify({
        description_en: en,
        description: ru,
        description_hy: hy,
        translated_at: new Date().toISOString(),
      }),
      prefer: "return=minimal",
    });
    if (i % 10 === 0) {
      saveCache();
      console.log(`  descriptions ${i}/${byText.size}`);
    }
  }
  saveCache();
  console.log("Descriptions done.");
}

async function fillSpecs() {
  console.log("\n=== Specs ===");
  const filter = overwrite
    ? "select=sku,specs_en,specs,specs_hy&specs_en=not.is.null"
    : "select=sku,specs_en,specs,specs_hy&specs_hy=is.null&specs_en=not.is.null";
  const rows = await api(`products?${filter}&limit=5000`);
  console.log(`Products to process: ${rows.length}`);
  if (!rows.length) return;

  const keys = new Set();
  const vals = new Set();
  for (const r of rows) {
    const en = r.specs_en || r.specs || {};
    for (const [k, v] of Object.entries(en)) {
      keys.add(k);
      if (needsValueTranslation(v)) vals.add(v);
    }
  }
  console.log(`Unique keys: ${keys.size}, translatable values: ${vals.size}`);

  const keyMaps = await buildMaps(keys, ["ru", "hy"]);
  const valMaps = await buildMaps(vals, ["ru", "hy"]);
  saveCache();

  let i = 0;
  for (const r of rows) {
    i++;
    const en = r.specs_en || r.specs || {};
    if (!en || !Object.keys(en).length) continue;
    const { ru, hy } = applySpecMaps(en, keyMaps.ru, keyMaps.hy, valMaps.ru, valMaps.hy);
    await api(`products?sku=eq.${encodeURIComponent(r.sku)}`, {
      method: "PATCH",
      body: JSON.stringify({
        specs_en: en,
        specs: ru,
        specs_hy: hy,
        translated_at: new Date().toISOString(),
      }),
      prefer: "return=minimal",
    });
    if (i % 100 === 0) console.log(`  specs applied ${i}/${rows.length}`);
  }
  saveCache();
  console.log("Specs done.");
}

async function main() {
  console.log("fill-product-i18n: start");
  if (!specsOnly) await fillDescriptions();
  if (!descriptionsOnly) await fillSpecs();
  saveCache();
  console.log("All done.");
}

main().catch((e) => {
  console.error(e);
  saveCache();
  process.exit(1);
});
