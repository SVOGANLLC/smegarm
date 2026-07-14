import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { telegramSendMessage } from "@/lib/telegram-api";

async function tgSend(chatId: string, text: string) {
  return telegramSendMessage(chatId, text);
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

/** Test ping — ONLY the signed-in user's own Chat ID (never the whole team). */
export const sendMyTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("telegram_chat_id,full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const chat = profile?.telegram_chat_id as string | null | undefined;
    if (!chat) throw new Error("Сначала сохраните Chat ID");

    const who = (profile?.full_name as string | null)?.trim() || "сотрудник";
    const ok = await tgSend(
      chat,
      [
        `✅ <b>Smeg Armenia — личный тест</b>`,
        ``,
        `Это сообщение только для вашего аккаунта (<b>${who}</b>).`,
        `Другим сотрудникам оно не отправлялось.`,
        ``,
        `Chat ID: <code>${chat}</code>`,
      ].join("\n"),
    );
    if (!ok) {
      throw new Error(
        "Не удалось отправить — проверьте Chat ID и что вы написали боту @smegarmbot хотя бы раз",
      );
    }
    return { ok: true, chat_id: chat };
  });

/** Broadcast to every admin/manager with a saved chat_id (orders / inquiries). */
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
  const chats = Array.from(
    new Set((profs ?? []).map((p: any) => p.telegram_chat_id as string).filter(Boolean)),
  );
  await Promise.all(chats.map((c) => tgSend(c, text)));
}
