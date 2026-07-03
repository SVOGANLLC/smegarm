import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { telegramSendMessage } from "@/lib/telegram-api";

function deriveSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function sendMessage(chatId: number | string, text: string) {
  await telegramSendMessage(chatId, text);
}

function reply(chatId: number, firstName: string | undefined) {
  const greet = firstName ? `Здравствуйте, ${firstName}!` : "Здравствуйте!";
  return [
    `<b>${greet}</b>`,
    "",
    "Это бот уведомлений <b>Smeg Armenia</b>.",
    "",
    "Ваш Chat ID:",
    `<code>${chatId}</code>`,
    "",
    "Скопируйте его и вставьте в админ-панели сайта:",
    "<i>Уведомления → Telegram → Сохранить</i>",
    "",
    "После сохранения вы будете получать новые заказы и заявки прямо сюда.",
  ].join("\n");
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("not configured", { status: 500 });

        const expected = deriveSecret(token);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update: any = await request.json().catch(() => ({}));
        const msg = update?.message ?? update?.edited_message;
        const chatId = msg?.chat?.id;
        if (typeof chatId === "number") {
          try {
            await sendMessage(chatId, reply(chatId, msg?.from?.first_name));
          } catch (e) {
            console.error("[telegram] webhook reply failed", e);
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});