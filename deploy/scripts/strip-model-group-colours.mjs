#!/usr/bin/env node
/**
 * Strip colour words from model-group display names and update site_content labels.
 *
 * Usage:
 *   node --experimental-strip-types deploy/scripts/strip-model-group-colours.mjs          # preview
 *   node --experimental-strip-types deploy/scripts/strip-model-group-colours.mjs --apply  # write DB
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectColourTokens,
  proposeGroupNames,
} from "../../src/lib/strip-colour-from-name.ts";
import {
  labelForModelGroup,
  parseModelGroupLabels,
  serializeModelGroupLabels,
  skuModelPrefix,
  upsertModelGroupLabel,
} from "../../src/lib/model-group-labels.ts";
import { buildProductGroups } from "../../src/lib/catalog-grouping.ts";

const APPLY = process.argv.includes("--apply");
const exportArg = process.argv.find((a) => a.startsWith("--export="));
const EXPORT_PATH = exportArg ? exportArg.slice("--export=".length) : null;

function loadEnv() {
  const out = {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (!out.SUPABASE_URL || !out.KEY) {
    for (const p of [resolve(process.cwd(), ".env"), "/opt/smeg/.env"]) {
      try {
        for (const line of readFileSync(p, "utf8").split("\n")) {
          const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
          if (!m) continue;
          const v = m[2].replace(/^["']|["']$/g, "");
          if (!out.SUPABASE_URL && m[1] === "SUPABASE_URL") out.SUPABASE_URL = v;
          if (!out.SUPABASE_URL && m[1] === "VITE_SUPABASE_URL") out.SUPABASE_URL = v;
          if (!out.KEY && m[1] === "SUPABASE_SERVICE_ROLE_KEY") out.KEY = v;
          if (!out.KEY && m[1] === "SERVICE_ROLE_KEY") out.KEY = v;
          if (!out.KEY && m[1] === "VITE_SUPABASE_PUBLISHABLE_KEY") out.KEY = v;
        }
      } catch {
        /* next */
      }
    }
  }
  if (!out.SUPABASE_URL || !out.KEY) throw new Error("Missing SUPABASE_URL or API key in env/.env");
  return out;
}

async function api(env, path, opts = {}) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: env.KEY,
      Authorization: `Bearer ${env.KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
      ...(opts.range ? { Range: opts.range } : {}),
    },
  });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text()}`);
  if (r.status === 204) return null;
  return r.json();
}

async function fetchAllProducts(env) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const chunk = await api(
      env,
      "products?select=sku,name,name_en,name_hy,colour,colour_en,colour_hy,model_group&model_group=not.is.null",
      { range: `${offset}-${offset + pageSize - 1}` },
    );
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

function pickRepresentative(members) {
  return [...members].sort((a, b) => a.sku.localeCompare(b.sku))[0];
}

function shortKey(key) {
  return key.length > 36 ? `${key.slice(0, 33)}…` : key;
}

const env = loadEnv();
const products = await fetchAllProducts(env);

const bySku = new Map(products.map((p) => [p.sku, p]));
const catalogGroups = buildProductGroups(
  products.map((row) => ({
    sku: row.sku,
    model_group: row.model_group,
    price_amd: null,
    name: row.name,
  })),
);

const groups = catalogGroups
  .map((g) => {
    const members = g.skus.map((sku) => bySku.get(sku)).filter(Boolean);
    const colours = new Set(members.map((m) => m.colour?.trim()).filter(Boolean));
    return [g.key, { members, colours, representativeSku: g.representativeSku }];
  })
  .filter(([, v]) => v.members.length >= 2 && v.colours.size >= 2)
  .sort(([a], [b]) => a.localeCompare(b));

const siteRows = await api(env, "site_content?select=key,value&key=eq.categories");
const categoriesValue = siteRows?.[0]?.value ?? {};
const labels = parseModelGroupLabels({
  "config.modelGroupLabels": categoriesValue["config.modelGroupLabels"] ?? {},
});

const rows = [];
let labelsNext = labels;

for (const [key, group] of groups) {
  const rep = bySku.get(group.representativeSku) ?? pickRepresentative(group.members);
  const labelKey = rep.model_group?.trim() || key;
  const existing = labelForModelGroup(labels, labelKey) ?? labelForModelGroup(labels, key);
  const ruMember = group.members.find((m) => /[а-яёԱ-Ֆ]/i.test(m.name ?? ""));
  const sources = {
    ru: existing?.name_ru?.trim() || ruMember?.name?.trim() || rep.name?.trim() || "",
    en: existing?.name_en?.trim() || rep.name_en?.trim() || rep.name?.trim() || "",
    hy: existing?.name_hy?.trim() || rep.name_hy?.trim() || rep.name?.trim() || "",
  };
  const proposed = proposeGroupNames(group.members, sources);
  const beforeRu = sources.ru;
  const changed =
    beforeRu !== proposed.name_ru ||
    sources.en !== proposed.name_en ||
    sources.hy !== proposed.name_hy;

  if (changed || !existing) {
    const patch = {
      name_ru: proposed.name_ru || undefined,
      name_en: proposed.name_en || undefined,
      name_hy: proposed.name_hy || undefined,
      image: existing?.image,
      image_sku: existing?.image_sku,
    };
    labelsNext = upsertModelGroupLabel(labelsNext, labelKey, patch);
    const prefix = skuModelPrefix(rep.sku);
    if (prefix && prefix !== labelKey && prefix !== key) {
      labelsNext = upsertModelGroupLabel(labelsNext, prefix, patch);
    }
    if (key !== labelKey && key !== prefix) {
      labelsNext = upsertModelGroupLabel(labelsNext, key, patch);
    }
  }

  rows.push({
    key: labelKey,
    catalogKey: key,
    short: shortKey(key),
    colours: group.colours.size,
    skus: group.members.length,
    beforeRu,
    afterRu: proposed.name_ru,
    afterEn: proposed.name_en,
    afterHy: proposed.name_hy,
    changed,
  });
}

console.log(`\nЦветовые группы: ${rows.length} · изменится: ${rows.filter((r) => r.changed).length}\n`);
console.log(
  `${"Ключ".padEnd(14)} ${"Цв".padStart(2)} ${"SKU".padStart(3)}  ${"Было (RU)".padEnd(42)} → Стало (RU)`,
);
console.log("-".repeat(110));

for (const r of rows) {
  const mark = r.changed ? "•" : " ";
  const before = (r.beforeRu || "—").slice(0, 42);
  const after = (r.afterRu || "—").slice(0, 42);
  const keyCol = r.catalogKey !== r.key ? `${r.key} (${r.catalogKey})` : r.key;
  console.log(`${mark} ${shortKey(keyCol).padEnd(12)} ${String(r.colours).padStart(2)} ${String(r.skus).padStart(3)}  ${before.padEnd(42)} → ${after}`);
}

if (EXPORT_PATH) {
  const header = ["key", "catalog_key", "colours", "skus", "name_ru_before", "name_ru", "name_en", "name_hy"].join("\t");
  const lines = rows.map((r) =>
    [r.key, r.catalogKey, r.colours, r.skus, r.beforeRu, r.afterRu, r.afterEn, r.afterHy]
      .map((v) => String(v ?? "").replace(/\t/g, " "))
      .join("\t"),
  );
  const out = resolve(EXPORT_PATH);
  writeFileSync(out, `${header}\n${lines.join("\n")}\n`, "utf8");
  console.log(`\nЭкспорт: ${out}`);
}

if (!APPLY) {
  console.log("\nПревью. Для записи в БД: node --experimental-strip-types deploy/scripts/strip-model-group-colours.mjs --apply");
  process.exit(0);
}

const json = serializeModelGroupLabels(labelsNext);
const nextValue = {
  ...categoriesValue,
  "config.modelGroupLabels": { ru: json, en: json, hy: json },
};

await api(env, "site_content?key=eq.categories", {
  method: "PATCH",
  prefer: "return=representation",
  body: JSON.stringify({ value: nextValue }),
});

console.log(`\n✓ Сохранено ${labelsNext.length} названий групп в site_content.categories (${rows.filter((r) => r.changed).length} с изменением текста)`);
