import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(apiKey: string) {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`${GATEWAY}/sendMessage`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
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
        const key = process.env.TELEGRAM_API_KEY;
        if (!key) return new Response("not configured", { status: 500 });

        const expected = deriveSecret(key);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update: any = await request.json().catch(() => ({}));
        const msg = update?.message ?? update?.edited_message;
        const chatId = msg?.chat?.id;
        if (typeof chatId === "number") {
          await sendMessage(chatId, reply(chatId, msg?.from?.first_name));
        }
        return Response.json({ ok: true });
      },
    },
  },
});