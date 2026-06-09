ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS px_number text,
  ADD COLUMN IF NOT EXISTS payment_status text;
CREATE INDEX IF NOT EXISTS orders_px_number_idx ON public.orders(px_number);