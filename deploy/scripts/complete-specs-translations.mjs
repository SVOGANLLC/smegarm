#!/usr/bin/env node
/**
 * Finish specs_hy + specs (RU) for products missing translations.
 *
 * Requires GEMINI_API_KEY in env (free: https://aistudio.google.com/apikey).
 * Cache is persisted on disk — safe to re-run after interruption.
 *
 * On VPS:
 *   echo 'GEMINI_API_KEY=...' >> /opt/smeg/.env
 *   bash /opt/smeg/deploy/scripts/run-complete-specs.sh
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = process.env.TRANSLATE_CACHE_PATH || join(__dir, ".translate-cache.json");
const BATCH = Number(process.env.TRANSLATE_BATCH_SIZE || 40);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

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

async function translateStrings(strings, lang) {
  const map = {};
  const pending = [];
  for (const s of strings) {
    const ck = `${lang}::${s}`;
    if (cache[ck]) map[s] = cache[ck];
    else pending.push(s);
  }
  console.log(`  ${lang}: ${strings.size - pending.length} cached, ${pending.length} to translate`);

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const payload = Object.fromEntries(chunk.map((s, idx) => [`t${idx}`, s]));
    const out = await geminiJson(lang, payload);
    chunk.forEach((s, idx) => {
      const tr = out[`t${idx}`] ?? s;
      map[s] = tr;
      cache[`${lang}::${s}`] = tr;
    });
    saveCache();
    console.log(`  ${lang} batch ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
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

function applyMaps(specsEn, keyRu, keyHy, valRu, valHy) {
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

async function main() {
  console.log("complete-specs-translations: start");
  const rows = await api(
    "products?select=sku,specs_en,specs,specs_hy&specs_hy=is.null&specs_en=not.is.null&limit=5000",
  );
  console.log(`Products pending: ${rows.length}`);
  if (!rows.length) {
    console.log("Nothing to do.");
    return;
  }

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

  const keyRu = await translateStrings(keys, "ru");
  const keyHy = await translateStrings(keys, "hy");
  const valRu = await translateStrings(vals, "ru");
  const valHy = await translateStrings(vals, "hy");
  saveCache();

  let i = 0;
  for (const r of rows) {
    i++;
    const en = r.specs_en || r.specs || {};
    if (!Object.keys(en).length) continue;
    const { ru, hy } = applyMaps(en, keyRu, keyHy, valRu, valHy);
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
    if (i % 100 === 0) console.log(`  saved ${i}/${rows.length}`);
  }
  console.log(`Done. Updated ${rows.length} products.`);
}

main().catch((e) => {
  console.error(e);
  saveCache();
  process.exit(1);
});
