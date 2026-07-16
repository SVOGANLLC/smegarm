/** Telegram notification event keys stored in profiles.telegram_notify_prefs */
export const TELEGRAM_NOTIFY_EVENTS = [
  "order_new",
  "inquiry_new",
  "payment_paid",
  "payment_failed",
  "order_cancelled",
  "team_role",
] as const;

export type TelegramNotifyEvent = (typeof TELEGRAM_NOTIFY_EVENTS)[number];

export type TelegramNotifyPrefs = Record<TelegramNotifyEvent, boolean>;

export const DEFAULT_TELEGRAM_NOTIFY_PREFS: TelegramNotifyPrefs = {
  order_new: true,
  inquiry_new: true,
  payment_paid: true,
  payment_failed: true,
  order_cancelled: true,
  team_role: true,
};

export function normalizeTelegramNotifyPrefs(raw: unknown): TelegramNotifyPrefs {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_TELEGRAM_NOTIFY_PREFS };
  for (const key of TELEGRAM_NOTIFY_EVENTS) {
    if (typeof src[key] === "boolean") out[key] = src[key];
  }
  return out;
}

export function prefersTelegramEvent(prefs: unknown, event: TelegramNotifyEvent): boolean {
  return normalizeTelegramNotifyPrefs(prefs)[event];
}
