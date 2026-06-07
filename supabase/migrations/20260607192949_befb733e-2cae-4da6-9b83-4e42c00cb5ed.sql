
CREATE OR REPLACE FUNCTION public.can_manage_orders(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'manager'::app_role)
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ru';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_lang_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_lang_check CHECK (lang IN ('ru','en','hy'));

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ru';

ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_lang_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_lang_check CHECK (lang IN ('ru','en','hy'));

CREATE OR REPLACE FUNCTION public.orders_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) || jsonb_build_object(
      'from', OLD.status, 'to', NEW.status, 'at', now(), 'by', auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_log_status ON public.orders;
CREATE TRIGGER trg_orders_log_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_log_status_change();

DROP POLICY IF EXISTS "user sees own orders" ON public.orders;
CREATE POLICY "user sees own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_orders(auth.uid()));

DROP POLICY IF EXISTS "admin updates orders" ON public.orders;
DROP POLICY IF EXISTS "managers update orders" ON public.orders;
CREATE POLICY "managers update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.can_manage_orders(auth.uid()))
  WITH CHECK (public.can_manage_orders(auth.uid()));

DROP POLICY IF EXISTS "Admins read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Managers read inquiries" ON public.inquiries;
CREATE POLICY "Managers read inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (public.can_manage_orders(auth.uid()));

DROP POLICY IF EXISTS "Admins update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Managers update inquiries" ON public.inquiries;
CREATE POLICY "Managers update inquiries"
  ON public.inquiries FOR UPDATE TO authenticated
  USING (public.can_manage_orders(auth.uid()))
  WITH CHECK (public.can_manage_orders(auth.uid()));
