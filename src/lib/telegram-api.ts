import https from "node:https";

const API_HOST = "api.telegram.org";

function gatewayBase(): string | null {
  const raw = process.env.TELEGRAM_GATEWAY_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function gatewaySecret(): string | null {
  return process.env.TELEGRAM_GATEWAY_SECRET?.trim() || null;
}

/** Prefer forced IPv4 on locked-down VPS (Reg.ru blocks many Telegram/Railway routes). */
function forceTelegramIp(): string | null {
  const ip = process.env.TELEGRAM_API_FORCE_IP?.trim();
  return ip || null;
}

export function telegramApiUrl(method: string): string {
  const base = (process.env.TELEGRAM_API_BASE || `https://${API_HOST}`).replace(/\/+$/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `${base}/bot${token}/${method}`;
}

async function telegramApiCallDirect(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const payload = JSON.stringify(body);
  const forceIp = forceTelegramIp();

  if (forceIp) {
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: forceIp,
          servername: API_HOST,
          path: `/bot${token}/${method}`,
          method: "POST",
          headers: {
            Host: API_HOST,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
          timeout: 15_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            let json: unknown = {};
            try {
              json = JSON.parse(raw);
            } catch {
              /* keep {} */
            }
            const status = res.statusCode ?? 0;
            resolve({ ok: status >= 200 && status < 300, status, json });
          });
        },
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, status: 0, json: { ok: false, description: "timeout" } });
      });
      req.on("error", (e) => {
        resolve({ ok: false, status: 0, json: { ok: false, description: String(e) } });
      });
      req.write(payload);
      req.end();
    });
  }

  const url = telegramApiUrl(method);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** @deprecated prefer telegramSendMessage; kept for rare direct callers */
export async function telegramApiCall(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return telegramApiCallDirect(method, body);
}

async function sendViaGateway(chatId: string | number, text: string): Promise<boolean> {
  const base = gatewayBase();
  const secret = gatewaySecret();
  if (!base || !secret) return false;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5_000);
  try {
    const res = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: ac.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (!res.ok || !json?.ok) {
      console.error("[telegram] gateway send failed", res.status, json);
      return false;
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export async function telegramSendMessage(
  chatId: string | number,
  text: string,
): Promise<boolean> {
  try {
    // Gateway first (EU), short timeout — often blocked from RU VPS; then direct via forced IP.
    if (gatewayBase() && gatewaySecret()) {
      try {
        if (await sendViaGateway(chatId, text)) return true;
      } catch (e) {
        console.warn("[telegram] gateway unreachable, falling back to direct API", e);
      }
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) return false;

    const { ok, json } = await telegramApiCallDirect("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (!ok || !(json as { ok?: boolean })?.ok) {
      console.error("[telegram] sendMessage failed", json);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[telegram] sendMessage error", e);
    return false;
  }
}
