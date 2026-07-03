-- Phase 0 analytics: search log, product views, admin read-only stats.
-- Additive only; existing catalog/checkout flows unchanged.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager');
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.search_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 200),
  results_count integer NOT NULL DEFAULT 0 CHECK (results_count >= 0),
  source text NOT NULL DEFAULT 'site' CHECK (source IN ('header', 'catalog', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_log_created_idx ON public.search_log (created_at DESC);
CREATE INDEX IF NOT EXISTS search_log_query_idx ON public.search_log (lower(query));

ALTER TABLE public.search_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff reads search log" ON public.search_log;
CREATE POLICY "staff reads search log"
  ON public.search_log FOR SELECT TO authenticated
  USING (public.is_staff());

GRANT SELECT ON public.search_log TO authenticated;
GRANT ALL ON public.search_log TO service_role;

-- Fire-and-forget product view counter (published products only).
CREATE OR REPLACE FUNCTION public.increment_product_view(p_sku text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE sku = upper(btrim(p_sku))
    AND is_published = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_product_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_view(text) TO anon, authenticated, service_role;

-- Fire-and-forget site search log.
CREATE OR REPLACE FUNCTION public.log_site_search(
  p_query text,
  p_results_count integer DEFAULT 0,
  p_source text DEFAULT 'site'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := lower(btrim(coalesce(p_query, '')));
  src text := lower(btrim(coalesce(p_source, 'site')));
BEGIN
  IF q = '' OR char_length(q) > 200 THEN
    RETURN;
  END IF;
  IF src NOT IN ('header', 'catalog', 'admin') THEN
    src := 'catalog';
  END IF;
  INSERT INTO public.search_log (query, results_count, source)
  VALUES (q, greatest(coalesce(p_results_count, 0), 0), src);
END;
$$;

REVOKE ALL ON FUNCTION public.log_site_search(text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_site_search(text, integer, text) TO anon, authenticated, service_role;

-- Admin dashboard aggregates (read-only).
CREATE OR REPLACE FUNCTION public.admin_analytics_overview(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(least(p_days, 365), 1));
  result json;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT json_build_object(
    'order_count', COUNT(*)::bigint,
    'revenue_amd', COALESCE(SUM(total_amd), 0)::bigint,
    'avg_order_amd', COALESCE(ROUND(AVG(total_amd)), 0)::bigint,
    'cancelled_count', (
      SELECT COUNT(*)::bigint FROM public.orders o2
      WHERE o2.created_at >= since AND o2.status = 'cancelled'
    )
  )
  INTO result
  FROM public.orders
  WHERE created_at >= since
    AND status <> 'cancelled';

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_daily_sales(p_days integer DEFAULT 30)
RETURNS TABLE (day date, order_count bigint, revenue_amd bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(least(p_days, 365), 1));
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Yerevan')::date AS day,
    COUNT(*)::bigint AS order_count,
    COALESCE(SUM(o.total_amd), 0)::bigint AS revenue_amd
  FROM public.orders o
  WHERE o.created_at >= since
    AND o.status <> 'cancelled'
  GROUP BY 1
  ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_top_products(p_days integer DEFAULT 30, p_limit integer DEFAULT 10)
RETURNS TABLE (
  product_sku text,
  product_name text,
  qty bigint,
  revenue_amd bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(least(p_days, 365), 1));
  lim integer := greatest(least(coalesce(p_limit, 10), 50), 1);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    oi.product_sku,
    MAX(oi.name) AS product_name,
    SUM(oi.qty)::bigint AS qty,
    SUM(oi.subtotal_amd)::bigint AS revenue_amd
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  WHERE o.created_at >= since
    AND o.status <> 'cancelled'
    AND oi.product_sku IS NOT NULL
  GROUP BY oi.product_sku
  ORDER BY SUM(oi.subtotal_amd) DESC
  LIMIT lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_top_searches(p_days integer DEFAULT 30, p_limit integer DEFAULT 15)
RETURNS TABLE (
  query text,
  search_count bigint,
  zero_results_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(least(p_days, 365), 1));
  lim integer := greatest(least(coalesce(p_limit, 15), 50), 1);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    sl.query,
    COUNT(*)::bigint AS search_count,
    COUNT(*) FILTER (WHERE sl.results_count = 0)::bigint AS zero_results_count
  FROM public.search_log sl
  WHERE sl.created_at >= since
  GROUP BY sl.query
  ORDER BY COUNT(*) DESC
  LIMIT lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_top_views(p_limit integer DEFAULT 15)
RETURNS TABLE (
  sku text,
  product_name text,
  view_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer := greatest(least(coalesce(p_limit, 15), 50), 1);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT p.sku, p.name AS product_name, p.view_count
  FROM public.products p
  WHERE p.view_count > 0
  ORDER BY p.view_count DESC, p.sku
  LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_overview(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_daily_sales(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_top_products(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_top_searches(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_top_views(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_analytics_overview(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_daily_sales(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_top_products(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_top_searches(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_top_views(integer) TO authenticated, service_role;
