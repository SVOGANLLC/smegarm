-- Recompute availability on any product update (not only stock/lead_time columns).
-- Ensures lead_time_days + stock changes persist correctly when saved with other fields.
DROP TRIGGER IF EXISTS trg_products_avail ON public.products;
CREATE TRIGGER trg_products_avail
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_compute_availability();
