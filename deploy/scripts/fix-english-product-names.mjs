#!/usr/bin/env node
/** Fix products where Russian `name` is still English (= name_en). */
import { translateName } from "./translate-names-auto.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
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

const rows = await api(
  "products?select=sku,name,name_en&name_en=not.is.null&limit=5000",
);
const todo = rows.filter((r) => r.name_en && r.name === r.name_en);
console.log(`Fixing ${todo.length} product names...`);

for (const r of todo) {
  const [ru, hy] = translateName(r.name_en);
  await api(`products?sku=eq.${encodeURIComponent(r.sku)}`, {
    method: "PATCH",
    body: JSON.stringify({ name: ru, name_hy: hy }),
    prefer: "return=minimal",
  });
}
console.log("Done.");
