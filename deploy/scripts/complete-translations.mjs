#!/usr/bin/env node
/**
 * Finish missing product translations (descriptions + specs) using the same pattern:
 *   1) collect unique English strings
 *   2) translate each once (RU + HY) via Gemini batches + disk cache
 *   3) apply to all matching products
 *
 * Requires GEMINI_API_KEY (https://aistudio.google.com/apikey).
 *
 *   bash /opt/smeg/deploy/scripts/run-complete-translations.sh
 *   bash .../run-complete-translations.sh --specs-only
 *   bash .../run-complete-translations.sh --descriptions-only
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = process.env.TRANSLATE_CACHE_PATH || join(__dir, ".translate-cache.json");
const BATCH_SHORT = Number(process.env.TRANSLATE_BATCH_SIZE || 40);
const BATCH_DESC = Number(process.env.TRANSLATE_DESC_BATCH || 8);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const args = new Set(process.argv.slice(2));
const specsOnly = args.has("--specs-only");
const descriptionsOnly = args.has("--descriptions-only");

if (!SERVICE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error("Set GEMINI_API_KEY (https://aistudio.google.com/apikey)");
  process.exit(1);
}

const KEEP = [
  "Smeg", "SMEG", "Dolce & Gabbana", "Dolce&Gabbana", "D&G",
  "Blu Mediterraneo", "Sicily Is My Love", "Divina Cucina",
  "Coca-Cola", "Coca Cola", "Smeg500",
  "FAB28", "FAB30", "FAB32", "FAB38", "FAB50",
  "Porsche", "Porsche Shade Green", "Porsche Shade White", "Porsche 917",
];

const SYS = `You are a professional translator for a Smeg appliance catalog in Armenia.
Translate the provided JSON values from English to the target language.
Rules:
- Keep these brand names EXACTLY as-is: ${KEEP.join(", ")}.
- Keep model codes, SKUs, units (W, kW, L, kg, mm, °C), and numbers untouched.
- Preserve HTML tags if present.
- Return ONLY a JSON object with the same keys as the input, no commentary.`;

async function api(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
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
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

async function geminiJson(lang, payload) {
  const langName = lang === "ru" ? "Russian (Русский)" : "Armenian (Հայերեն)";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYS }] },
        contents: [
          {
            parts: [
              {
                text: `Target language: ${langName}\nInput JSON:\n${JSON.stringify(payload)}`,
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (r.status === 429) {
      const wait = 15_000 * (attempt + 1);
      console.warn(`  rate limit, wait ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : {};
    }
  }
  throw new Error("Gemini rate limit exceeded after retries");
}

/** Same pattern for descriptions, spec keys, and spec values. */
async function translateStrings(strings, lang, batchSize) {
  const map = {};
  const pending = [];
  for (const s of strings) {
    const ck = `${lang}::${s}`;
    if (cache[ck]) map[s] = cache[ck];
    else pending.push(s);
  }
  console.log(`  ${lang}: ${strings.size - pending.length} cached, ${pending.length} to translate`);

  for (let i = 0; i < pending.length; i += batchSize) {
    const chunk = pending.slice(i, i + batchSize);
    const payload = Object.fromEntries(chunk.map((s, idx) => [`t${idx}`, s]));
    const out = await geminiJson(lang, payload);
    chunk.forEach((s, idx) => {
      const tr = out[`t${idx}`] ?? s;
      map[s] = tr;
      cache[`${lang}::${s}`] = tr;
    });
    saveCache();
    console.log(`  ${lang} batch ${Math.min(i + batchSize, pending.length)}/${pending.length}`);
    await sleep(1200);
  }
  return map;
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

function needsValueTranslation(val) {
  if (!val || val.length < 2) return false;
  if (/^[0-9 .,/%°()\-–—+]+$/.test(val)) return false;
  if (/^\d+\s*(mm|cm|kg|W|kW|Hz|V|A|L|l)\b/i.test(val)) return false;
  if (!/[A-Za-z]{3}/.test(val)) return false;
  return true;
}

function applySpecMaps(specsEn, keyRu, keyHy, valRu, valHy) {
  const ru = {};
  const hy = {};
  for (const [k, v] of Object.entries(specsEn)) {
    const tkRu = keyRu[k] ?? k;
    const tkHy = keyHy[k] ?? k;
    const d = DICT[v];
    ru[tkRu] = d ? d[0] : (valRu[v] ?? v);
    hy[tkHy] = d ? d[1] : (valHy[v] ?? v);
  }
  return { ru, hy };
}

/** Descriptions: unique EN text → translate once → patch all SKUs with that text. */
async function fillDescriptions() {
  console.log("\n=== Descriptions (unique-text pattern) ===");
  const rows = await api(
    "products?select=sku,description_en,description,description_hy&description_hy=is.null&description_en=not.is.null&limit=5000",
  );
  console.log(`Products pending: ${rows.length}`);
  if (!rows.length) return;

  const byText = new Map();
  for (const r of rows) {
    const en = (r.description_en || r.description || "").trim();
    if (!en) continue;
    if (!byText.has(en)) byText.set(en, []);
    byText.get(en).push(r.sku);
  }
  console.log(`Unique descriptions: ${byText.size}`);

  const texts = new Set(byText.keys());
  const ruMap = await translateStrings(texts, "ru", BATCH_DESC);
  const hyMap = await translateStrings(texts, "hy", BATCH_DESC);

  let i = 0;
  for (const [en, skus] of byText) {
    i++;
    const skuFilter = skus.map((s) => `sku.eq.${encodeURIComponent(s)}`).join(",");
    await api(`products?or=(${skuFilter})`, {
      method: "PATCH",
      body: JSON.stringify({
        description_en: en,
        description: ruMap[en],
        description_hy: hyMap[en],
        translated_at: new Date().toISOString(),
      }),
      prefer: "return=minimal",
    });
    if (i % 20 === 0) console.log(`  descriptions applied ${i}/${byText.size}`);
  }
  console.log("Descriptions done.");
}

/** Specs: unique keys + values → translate once → apply per product. */
async function fillSpecs() {
  console.log("\n=== Specs (unique-key/value pattern) ===");
  const rows = await api(
    "products?select=sku,specs_en,specs,specs_hy&specs_hy=is.null&specs_en=not.is.null&limit=5000",
  );
  console.log(`Products pending: ${rows.length}`);
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
  console.log(`Unique keys: ${keys.size}, values: ${vals.size}`);

  const keyRu = await translateStrings(keys, "ru", BATCH_SHORT);
  const keyHy = await translateStrings(keys, "hy", BATCH_SHORT);
  const valRu = await translateStrings(vals, "ru", BATCH_SHORT);
  const valHy = await translateStrings(vals, "hy", BATCH_SHORT);
  saveCache();

  let i = 0;
  for (const r of rows) {
    i++;
    const en = r.specs_en || r.specs || {};
    if (!Object.keys(en).length) continue;
    const { ru, hy } = applySpecMaps(en, keyRu, keyHy, valRu, valHy);
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
    if (i % 100 === 0) console.log(`  specs saved ${i}/${rows.length}`);
  }
  console.log("Specs done.");
}

async function main() {
  console.log("complete-translations: start");
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
