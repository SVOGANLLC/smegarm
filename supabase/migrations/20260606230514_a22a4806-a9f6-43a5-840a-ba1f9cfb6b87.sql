
-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no BIGSERIAL UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 200),
  customer_phone TEXT NOT NULL CHECK (char_length(customer_phone) BETWEEN 3 AND 50),
  customer_email TEXT CHECK (customer_email IS NULL OR char_length(customer_email) <= 255),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 120),
  address TEXT CHECK (address IS NULL OR char_length(address) <= 500),
  delivery_method TEXT NOT NULL DEFAULT 'pickup' CHECK (delivery_method IN ('pickup','courier_yerevan','courier_armenia')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card_transfer','idram')),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','confirmed','shipped','done','cancelled')),
  admin_notes TEXT,
  total_amd BIGINT NOT NULL DEFAULT 0 CHECK (total_amd >= 0),
  items_count INT NOT NULL DEFAULT 0 CHECK (items_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_order_no_seq TO authenticated, anon, service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can create order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "user sees own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX orders_created_idx ON public.orders (created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE INDEX orders_user_idx ON public.orders (user_id);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_sku TEXT REFERENCES public.products(sku) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image TEXT,
  unit_price_amd BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amd >= 0),
  qty INT NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 999),
  subtotal_amd BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_amd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "user sees own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "admin manages items" ON public.order_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX order_items_order_idx ON public.order_items (order_id);
CREATE INDEX order_items_sku_idx ON public.order_items (product_sku);
