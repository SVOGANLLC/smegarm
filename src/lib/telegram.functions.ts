import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function tgSend(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return r.ok;
}

export const getMyTelegram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { chat_id: (data?.telegram_chat_id as string | null) ?? null, bot: "smegarmbot" };
  });

export const saveMyTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ chat_id: z.string().regex(/^-?\d{4,16}$/, "Chat ID должен быть числом").nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ telegram_chat_id: data.chat_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendMyTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("telegram_chat_id,full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const chat = data?.telegram_chat_id as string | null | undefined;
    if (!chat) throw new Error("Сначала сохраните Chat ID");
    const ok = await tgSend(
      chat,
      `✅ <b>Smeg Armenia</b>\n\nТестовое уведомление успешно доставлено${data?.full_name ? `, ${data.full_name}` : ""}.`,
    );
    if (!ok) throw new Error("Не удалось отправить — проверьте Chat ID и что вы написали боту @smegarmbot хотя бы раз");
    return { ok: true };
  });

/** Internal helper — broadcast a message to every admin/manager with a saved chat_id. */
export async function broadcastToTeam(text: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "manager"]);
  const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
  if (!ids.length) return;
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id")
    .in("id", ids)
    .not("telegram_chat_id", "is", null);
  const chats = (profs ?? []).map((p: any) => p.telegram_chat_id).filter(Boolean);
  await Promise.all(chats.map((c: string) => tgSend(c, text)));
}