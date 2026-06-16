#!/usr/bin/env node
import crypto from "crypto";

const secret = crypto.randomBytes(32).toString("hex");
const postgresPassword = crypto.randomBytes(24).toString("base64url");

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function sign(payload, key) {
  const h = b64url({ alg: "HS256", typ: "JWT" });
  const p = b64url(payload);
  const sig = crypto.createHmac("sha256", key).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600;
const base = { iss: "supabase", ref: "smegarm", iat, exp };

console.log(`POSTGRES_PASSWORD=${postgresPassword}`);
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign({ ...base, role: "anon" }, secret)}`);
console.log(`SERVICE_ROLE_KEY=${sign({ ...base, role: "service_role" }, secret)}`);
