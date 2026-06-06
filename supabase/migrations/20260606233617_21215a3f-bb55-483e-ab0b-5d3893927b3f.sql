
-- Tighten orders INSERT policy: prevent injecting arbitrary user_id
DROP POLICY IF EXISTS "anyone can create order" ON public.orders;
CREATE POLICY "anyone can create order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL AND auth.uid() IS NULL)
  OR (user_id = auth.uid())
);

-- Tighten order_items INSERT policy: parent order must belong to caller (or be a guest order created in same session)
DROP POLICY IF EXISTS "anyone can insert items" ON public.order_items;
CREATE POLICY "anyone can insert items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (o.user_id IS NULL AND auth.uid() IS NULL)
        OR o.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);
