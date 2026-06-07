
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_time_days integer;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_qty_check,
  ADD  CONSTRAINT products_stock_qty_check CHECK (stock_qty >= 0),
  DROP CONSTRAINT IF EXISTS products_stock_reserved_check,
  ADD  CONSTRAINT products_stock_reserved_check CHECK (stock_reserved >= 0),
  DROP CONSTRAINT IF EXISTS products_lead_time_days_check,
  ADD  CONSTRAINT products_lead_time_days_check CHECK (lead_time_days IS NULL OR (lead_time_days >= 0 AND lead_time_days <= 365));

-- Recompute availability automatically from stock + lead_time
CREATE OR REPLACE FUNCTION public.products_compute_availability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE avail integer;
BEGIN
  avail := COALESCE(NEW.stock_qty,0) - COALESCE(NEW.stock_reserved,0);
  IF avail > 0 THEN
    NEW.availability := 'in_stock';
  ELSIF NEW.lead_time_days IS NOT NULL AND NEW.lead_time_days > 0 THEN
    NEW.availability := 'pre_order';
  ELSE
    NEW.availability := 'on_request';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_avail ON public.products;
CREATE TRIGGER trg_products_avail
BEFORE INSERT OR UPDATE OF stock_qty, stock_reserved, lead_time_days
ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_compute_availability();

-- Backfill availability for existing rows
UPDATE public.products SET stock_qty = stock_qty;

-- Reserve stock when an order item is added on an active order
CREATE OR REPLACE FUNCTION public.order_items_reserve_stock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE st text;
BEGIN
  IF NEW.product_sku IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO st FROM public.orders WHERE id = NEW.order_id;
  IF st IN ('new','in_progress','confirmed','shipped') THEN
    UPDATE public.products
      SET stock_reserved = stock_reserved + NEW.qty
      WHERE sku = NEW.product_sku;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_reserve ON public.order_items;
CREATE TRIGGER trg_order_items_reserve
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_items_reserve_stock();

-- Handle order status transitions
CREATE OR REPLACE FUNCTION public.orders_apply_stock_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  old_active boolean := OLD.status IN ('new','in_progress','confirmed','shipped');
  new_active boolean := NEW.status IN ('new','in_progress','confirmed','shipped');
  item record;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- done: decrement stock, release reservation (if was active)
  IF NEW.status = 'done' THEN
    FOR item IN SELECT product_sku, qty FROM public.order_items WHERE order_id = NEW.id AND product_sku IS NOT NULL LOOP
      IF old_active THEN
        UPDATE public.products
          SET stock_reserved = GREATEST(stock_reserved - item.qty, 0),
              stock_qty      = GREATEST(stock_qty - item.qty, 0)
          WHERE sku = item.product_sku;
      ELSE
        UPDATE public.products SET stock_qty = GREATEST(stock_qty - item.qty, 0)
          WHERE sku = item.product_sku;
      END IF;
    END LOOP;

  -- cancelled: release reservation if was active
  ELSIF NEW.status = 'cancelled' AND old_active THEN
    FOR item IN SELECT product_sku, qty FROM public.order_items WHERE order_id = NEW.id AND product_sku IS NOT NULL LOOP
      UPDATE public.products
        SET stock_reserved = GREATEST(stock_reserved - item.qty, 0)
        WHERE sku = item.product_sku;
    END LOOP;

  -- reactivate from cancelled/done back to active: reserve again
  ELSIF new_active AND NOT old_active THEN
    FOR item IN SELECT product_sku, qty FROM public.order_items WHERE order_id = NEW.id AND product_sku IS NOT NULL LOOP
      UPDATE public.products
        SET stock_reserved = stock_reserved + item.qty
        WHERE sku = item.product_sku;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock_transition ON public.orders;
CREATE TRIGGER trg_orders_stock_transition
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_apply_stock_transition();
