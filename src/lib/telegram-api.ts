const API_HOST = "api.telegram.org";

export function telegramApiUrl(method: string): string {
  const base = (process.env.TELEGRAM_API_BASE || `https://${API_HOST}`).replace(/\/+$/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `${base}/bot${token}/${method}`;
}

/** Server-side Telegram Bot API call. Requires Docker extra_hosts on Reg.ru VPS. */
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

export async function telegramSendMessage(
  chatId: string | number,
  text: string,
): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false;
  try {
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
