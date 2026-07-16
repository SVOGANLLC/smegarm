-- Per-user Telegram notification preferences (which events to receive).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_notify_prefs jsonb NOT NULL DEFAULT '{
    "order_new": true,
    "inquiry_new": true,
    "payment_paid": true,
    "payment_failed": true,
    "order_cancelled": true,
    "team_role": true
  }'::jsonb;

COMMENT ON COLUMN public.profiles.telegram_notify_prefs IS
  'Telegram alert toggles: order_new, inquiry_new, payment_paid, payment_failed, order_cancelled, team_role';
