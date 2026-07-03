-- Paginated + sortable views and search analytics lists.

DROP FUNCTION IF EXISTS public.admin_analytics_top_views(integer);
DROP FUNCTION IF EXISTS public.admin_analytics_top_searches(integer, integer);

CREATE OR REPLACE FUNCTION public.admin_analytics_top_views(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_sort_desc boolean DEFAULT true
)
RETURNS TABLE (
  sku text,
  product_name text,
  view_count integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer := greatest(least(coalesce(p_limit, 50), 5000), 1);
  off integer := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.sku,
    p.name AS product_name,
    p.view_count,
    COUNT(*) OVER()::bigint AS total_count
  FROM public.products p
  WHERE p.view_count > 0
  ORDER BY
    CASE WHEN p_sort_desc THEN p.view_count END DESC NULLS LAST,
    CASE WHEN NOT p_sort_desc THEN p.view_count END ASC NULLS LAST,
    p.sku ASC
  LIMIT lim
  OFFSET off;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_top_searches(
  p_days integer DEFAULT 30,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_sort_desc boolean DEFAULT true
)
RETURNS TABLE (
  query text,
  search_count bigint,
  zero_results_count bigint,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(least(p_days, 365), 1));
  lim integer := greatest(least(coalesce(p_limit, 50), 5000), 1);
  off integer := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH grouped AS (
    SELECT
      sl.query,
      COUNT(*)::bigint AS search_count,
      COUNT(*) FILTER (WHERE sl.results_count = 0)::bigint AS zero_results_count
    FROM public.search_log sl
    WHERE sl.created_at >= since
    GROUP BY sl.query
  )
  SELECT
    g.query,
    g.search_count,
    g.zero_results_count,
    COUNT(*) OVER()::bigint AS total_count
  FROM grouped g
  ORDER BY
    CASE WHEN p_sort_desc THEN g.search_count END DESC NULLS LAST,
    CASE WHEN NOT p_sort_desc THEN g.search_count END ASC NULLS LAST,
    g.query ASC
  LIMIT lim
  OFFSET off;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_top_views(integer, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_top_searches(integer, integer, integer, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_analytics_top_views(integer, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_top_searches(integer, integer, integer, boolean) TO authenticated, service_role;
