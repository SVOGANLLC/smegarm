import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { telegramSendMessage } from "@/lib/telegram-api";
import {
  DEFAULT_TELEGRAM_NOTIFY_PREFS,
  normalizeTelegramNotifyPrefs,
  prefersTelegramEvent,
  type TelegramNotifyEvent,
  type TelegramNotifyPrefs,
} from "@/lib/telegram-notify";

async function tgSend(chatId: string, text: string) {
  return telegramSendMessage(chatId, text);
}

export const getMyTelegram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("telegram_chat_id,telegram_notify_prefs")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      chat_id: (data?.telegram_chat_id as string | null) ?? null,
      bot: "smegarmbot",
      prefs: normalizeTelegramNotifyPrefs(data?.telegram_notify_prefs),
    };
  });

export const saveMyTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        chat_id: z.string().regex(/^-?\d{4,16}$/, "Chat ID должен быть числом").nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ telegram_chat_id: data.chat_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PrefsSchema = z.object({
  order_new: z.boolean(),
  inquiry_new: z.boolean(),
  payment_paid: z.boolean(),
  payment_failed: z.boolean(),
  order_cancelled: z.boolean(),
  team_role: z.boolean(),
});

export const saveMyTelegramPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PrefsSchema.parse(d) as TelegramNotifyPrefs)
  .handler(async ({ data, context }) => {
    const prefs = normalizeTelegramNotifyPrefs(data);
    const { error } = await context.supabase
      .from("profiles")
      .update({ telegram_notify_prefs: prefs })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, prefs };
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

/** Broadcast to admin/manager Chat IDs that opted into this event type. */
export async function broadcastToTeam(text: string, event: TelegramNotifyEvent) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "manager"]);
  const ids = Array.from(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
  if (!ids.length) return;

  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id,telegram_notify_prefs")
    .in("id", ids)
    .not("telegram_chat_id", "is", null);

  const chats = Array.from(
    new Set(
      (profs ?? [])
        .filter((p: { telegram_chat_id: string | null; telegram_notify_prefs: unknown }) =>
          prefersTelegramEvent(p.telegram_notify_prefs ?? DEFAULT_TELEGRAM_NOTIFY_PREFS, event),
        )
        .map((p: { telegram_chat_id: string | null }) => p.telegram_chat_id as string)
        .filter(Boolean),
    ),
  );
  await Promise.all(chats.map((c) => tgSend(c, text)));
}
