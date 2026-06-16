#!/usr/bin/env node
/**
 * Export readable data from Lovable Supabase via REST (anon key).
 * Usage: SOURCE_URL=... SOURCE_KEY=... node deploy/scripts/export-from-lovable.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/export");
const BASE = process.env.SOURCE_URL?.replace(/\/$/, "");
const KEY = process.env.SOURCE_KEY;

if (!BASE || !KEY) {
  console.error("Set SOURCE_URL and SOURCE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

async function fetchAll(table, select = "*", pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const res = await fetch(`${BASE}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
      headers: { ...headers, Range: `${from}-${to}` },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const TABLES = [
  "products",
  "collection_products",
  "color_swatches",
  "themes",
  "site_content",
];

mkdirSync(OUT, { recursive: true });

for (const table of TABLES) {
  process.stdout.write(`Exporting ${table}... `);
  const data = await fetchAll(table);
  writeFileSync(join(OUT, `${table}.json`), JSON.stringify(data, null, 2));
  console.log(data.length);
}

console.log(`\nSaved to ${OUT}`);
console.log(
  "\nNOTE: collections, partners, orders, profiles, user_roles need SQL export from Lovable editor.",
);
console.log("Run deploy/sql/export-admin-tables.sql there and save JSON to deploy/data/export/",
);
