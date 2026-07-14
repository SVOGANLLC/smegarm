const API_HOST = "api.telegram.org";

function gatewayBase(): string | null {
  const raw = process.env.TELEGRAM_GATEWAY_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function gatewaySecret(): string | null {
  return process.env.TELEGRAM_GATEWAY_SECRET?.trim() || null;
}

export function telegramApiUrl(method: string): string {
  const base = (process.env.TELEGRAM_API_BASE || `https://${API_HOST}`).replace(/\/+$/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `${base}/bot${token}/${method}`;
}

/** Direct Bot API call (local/dev or when gateway is not set). */
export async function telegramApiCall(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = telegramApiUrl(method);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function sendViaGateway(chatId: string | number, text: string): Promise<boolean> {
  const base = gatewayBase();
  const secret = gatewaySecret();
  if (!base || !secret) return false;

  const res = await fetch(`${base}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
  if (!res.ok || !json?.ok) {
    console.error("[telegram] gateway send failed", res.status, json);
    return false;
  }
  return true;
}

export async function telegramSendMessage(
  chatId: string | number,
  text: string,
): Promise<boolean> {
  try {
    if (gatewayBase() && gatewaySecret()) {
      return await sendViaGateway(chatId, text);
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) return false;
    const { ok, json } = await telegramApiCall("sendMessage", {
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
