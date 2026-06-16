#!/usr/bin/env node
/**
 * Import exported JSON into self-hosted Supabase via service_role REST.
 * Usage: TARGET_URL=http://127.0.0.1:8000 TARGET_KEY=service_role... node deploy/scripts/import-data.mjs
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "../data/export");
const BASE = process.env.TARGET_URL?.replace(/\/$/, "");
const KEY = process.env.TARGET_KEY;

if (!BASE || !KEY) {
  console.error("Set TARGET_URL and TARGET_KEY");
  process.exit(1);
}

const ORDER = [
  "themes",
  "color_swatches",
  "collections",
  "products",
  "collection_products",
  "site_content",
  "partners",
  "profiles",
  "user_roles",
  "orders",
  "order_items",
];

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

async function upsert(table, rows) {
  if (!rows?.length) return;
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const res = await fetch(`${BASE}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table} batch ${i}: ${res.status} ${text}`);
    }
    process.stdout.write(".");
  }
}

for (const table of ORDER) {
  const path = join(DIR, `${table}.json`);
  if (!existsSync(path)) {
    console.log(`Skip ${table} (no file)`);
    continue;
  }
  const rows = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(rows) || !rows.length) {
    console.log(`Skip ${table} (empty)`);
    continue;
  }
  process.stdout.write(`Import ${table} (${rows.length}) `);
  await upsert(table, rows);
  console.log(" OK");
}

console.log("Import complete.");
