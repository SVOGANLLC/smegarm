#!/usr/bin/env node
/**
 * Register Telegram webhook after HTTPS is live on the public domain.
 *
 * Usage (on VPS, from /opt/smeg):
 *   node deploy/scripts/setup-telegram-webhook.mjs
 *
 * Requires in app/.env:
 *   TELEGRAM_BOT_TOKEN
 *   PUBLIC_BASE_URL=https://smeg.am   (must be https)
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = resolve(root, ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const token = env.TELEGRAM_BOT_TOKEN;
const base = (env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing in .env");
  process.exit(1);
}
if (!base.startsWith("https://")) {
  console.error("PUBLIC_BASE_URL must be https://… (Telegram requires HTTPS)");
  process.exit(1);
}

const secret = createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
const webhookUrl = `${base}/api/public/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: true,
  }),
});
const json = await res.json();
if (!json.ok) {
  console.error("setWebhook failed:", json);
  process.exit(1);
}
console.log("Webhook set:", webhookUrl);
