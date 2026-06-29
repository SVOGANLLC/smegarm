#!/usr/bin/env node
/**
 * One-off / maintenance: fix Latin & Cyrillic lookalikes inside Armenian text fields.
 * Usage: node deploy/scripts/fix-hy-script.mjs  (reads /opt/smeg/.env or ./.env)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ARMENIAN = /[\u0530-\u058F]/;
const LOOKALIKE = {
  a: "ա", A: "Ա", b: "բ", B: "Բ", c: "ց", C: "Ց", d: "դ", D: "Դ", e: "ե", E: "Ե",
  g: "գ", G: "Գ", h: "հ", H: "Հ", i: "ի", I: "Ի", k: "կ", K: "Կ", l: "լ", L: "Լ",
  m: "մ", M: "Մ", n: "ն", N: "Ն", o: "ո", O: "Ո", p: "պ", P: "Պ", r: "ր", R: "Ր",
  s: "ս", S: "Ս", t: "տ", T: "Տ", u: "ու", v: "վ", V: "Վ", y: "յ", Y: "Յ", z: "զ", Z: "Զ",
  а: "ա", А: "Ա", б: "բ", Б: "Բ", в: "վ", В: "Վ", г: "գ", Г: "Գ", д: "դ", Д: "Դ",
  е: "ե", Е: "Ե", и: "ի", И: "Ի", к: "կ", К: "Կ", л: "լ", Л: "Լ", м: "մ", М: "Մ",
  н: "ն", Н: "Ն", о: "ո", О: "Ո", п: "պ", П: "Պ", р: "ր", Р: "Ր", с: "ս", С: "Ս",
  т: "տ", Т: "Տ", х: "խ", Х: "Խ", ч: "չ", Ч: "Չ", ш: "շ", Ш: "Շ", ь: "ի", ы: "ը",
};

function loadEnv() {
  for (const p of [resolve(process.cwd(), ".env"), "/opt/smeg/.env"]) {
    try {
      const env = {};
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      if (env.SUPABASE_SERVICE_ROLE_KEY) return env;
    } catch { /* try next */ }
  }
  throw new Error("SUPABASE_SERVICE_ROLE_KEY not found in .env");
}

function isSkuLike(word) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(word) && !ARMENIAN.test(word);
}

function fixWord(word) {
  if (!ARMENIAN.test(word) || isSkuLike(word)) return word;
  return [...word].map((ch) => (ARMENIAN.test(ch) ? ch : LOOKALIKE[ch] ?? ch)).join("");
}

function fixHy(text) {
  if (!text?.trim() || !ARMENIAN.test(text)) return text ?? "";
  return text.replace(/[\u0530-\u058Fa-zA-Z\u0400-\u04FF]+/g, fixWord);
}

async function rest(env, path, opts = {}) {
  const base = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "https://smeg.am").replace(/\/+$/, "");
  const url = `${base}/rest/v1/${path}`;
  const res = await fetch(url, {
  ...opts,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "PATCH" ? "return=minimal" : "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fixTable(env, table, idField, fields) {
  let fixed = 0;
  let scanned = 0;
  const PAGE = 500;
  let offset = 0;
  for (;;) {
    const rows = await rest(env, `${table}?select=${idField},${fields.join(",")}&limit=${PAGE}&offset=${offset}`);
    if (!rows?.length) break;
    for (const row of rows) {
      scanned += 1;
      const patch = {};
      for (const f of fields) {
        const before = row[f];
        if (!before) continue;
        const after = fixHy(before);
        if (after !== before) patch[f] = after;
      }
      if (!Object.keys(patch).length) continue;
      await rest(env, `${table}?${idField}=eq.${encodeURIComponent(row[idField])}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      fixed += 1;
      if (fixed <= 20) console.log(`${table}.${row[idField]}:`, JSON.stringify(patch));
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return { table, scanned, fixed };
}

const env = loadEnv();
console.log("Fixing HY mixed script on", env.SUPABASE_URL || env.VITE_SUPABASE_URL);

const results = [];
results.push(await fixTable(env, "products", "sku", ["name_hy", "description_hy", "category_hy", "colour_hy"]));
results.push(await fixTable(env, "collections", "id", ["name_hy", "description_hy"]));

for (const r of results) {
  console.log(`${r.table}: scanned ${r.scanned}, fixed ${r.fixed}`);
}
