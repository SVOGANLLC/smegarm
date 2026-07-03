import { Agent, fetch as undiciFetch } from "undici";

const API_HOST = "api.telegram.org";

/** Reg.ru VPS often blocks some Telegram DC IPs; this one is reachable from 89.108.66.148 */
const DEFAULT_FORCE_IP = "149.154.167.220";

let dispatcher: Agent | undefined;

function getDispatcher(): Agent | undefined {
  const forceIp = (process.env.TELEGRAM_API_FORCE_IP || DEFAULT_FORCE_IP).trim();
  if (!forceIp) return undefined;
  dispatcher ??= new Agent({
    connect: {
      host: forceIp,
      port: 443,
      servername: API_HOST,
    },
  });
  return dispatcher;
}

export function telegramApiUrl(method: string): string {
  const base = (process.env.TELEGRAM_API_BASE || `https://${API_HOST}`).replace(/\/+$/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `${base}/bot${token}/${method}`;
}

/** Server-side Telegram Bot API call (works around blocked DC IPs on some VPS hosts). */
export async function telegramApiCall(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = telegramApiUrl(method);
  const dispatcher = getDispatcher();
  const res = await undiciFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    dispatcher,
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
