-- Manager catalog access, auto-sync collection membership, WKF01 name fixes

CREATE OR REPLACE FUNCTION public.can_manage_catalog(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'manager'::app_role)
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_catalog(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins write products" ON public.products;
CREATE POLICY "Staff write products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()))
  WITH CHECK (public.can_manage_catalog(auth.uid()));

DROP POLICY IF EXISTS "collection_products_admin_write" ON public.collection_products;
CREATE POLICY "collection_products_staff_write"
  ON public.collection_products
  FOR ALL
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()))
  WITH CHECK (public.can_manage_catalog(auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_product_collections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NOT COALESCE(NEW.is_published, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
  SELECT c.id, NEW.sku, 0
  FROM public.collections c
  WHERE (
    (c.slug = 'isola' AND NEW.aesthetic = 'Isola')
    OR (c.slug = 'musa' AND NEW.aesthetic = 'Musa')
    OR (c.slug = 'dolce-stil-novo' AND NEW.aesthetic = 'Dolce Stil Novo')
    OR (c.slug = 'linea' AND NEW.aesthetic = 'Linea')
    OR (c.slug = 'classica' AND NEW.aesthetic = 'Classica')
    OR (c.slug = 'portofino' AND NEW.aesthetic = 'Portofino')
    OR (c.slug = 'piano-design' AND NEW.aesthetic = 'Piano Design')
    OR (c.slug = 'cortina' AND NEW.aesthetic = 'Cortina')
    OR (c.slug = 'fab-50s' AND NEW.aesthetic = '50''s Style')
    OR (c.slug = 'victoria' AND NEW.aesthetic = 'Victoria')
    OR (c.slug = 'coloniale' AND NEW.aesthetic = 'Coloniale')
    OR (c.slug = 'universale' AND NEW.aesthetic = 'Universale')
    OR (c.slug = 'blu-mediterraneo' AND NEW.theme_key = 'dg_blu_mediterraneo')
    OR (c.slug = 'dolce-gabbana-sicily' AND NEW.theme_key = 'dg_sicily')
    OR (c.slug = 'divina-cucina' AND NEW.theme_key = 'dg_divina_cucina')
    OR (c.slug = 'dolce-gabbana' AND NEW.theme_key LIKE 'dg_%')
    OR (c.slug = 'coca-cola' AND NEW.theme_key = 'coca_cola')
    OR (c.slug = 'smeg500' AND NEW.theme_key = 'smeg500')
    OR (c.slug = 'porsche' AND NEW.theme_key IN ('porsche', 'porsche_green', 'porsche_white', 'porsche_917'))
  )
  ON CONFLICT (collection_id, product_sku) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_collections ON public.products;
CREATE TRIGGER trg_sync_product_collections
  AFTER INSERT OR UPDATE OF aesthetic, theme_key, is_published
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_collections();

-- Backfill missing collection links for published products
INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT c.id, p.sku, 0
FROM public.collections c
JOIN public.products p ON p.is_published
  AND (
    (c.slug = 'isola' AND p.aesthetic = 'Isola')
    OR (c.slug = 'musa' AND p.aesthetic = 'Musa')
    OR (c.slug = 'dolce-stil-novo' AND p.aesthetic = 'Dolce Stil Novo')
    OR (c.slug = 'linea' AND p.aesthetic = 'Linea')
    OR (c.slug = 'classica' AND p.aesthetic = 'Classica')
    OR (c.slug = 'portofino' AND p.aesthetic = 'Portofino')
    OR (c.slug = 'piano-design' AND p.aesthetic = 'Piano Design')
    OR (c.slug = 'cortina' AND p.aesthetic = 'Cortina')
    OR (c.slug = 'fab-50s' AND p.aesthetic = '50''s Style')
    OR (c.slug = 'victoria' AND p.aesthetic = 'Victoria')
    OR (c.slug = 'coloniale' AND p.aesthetic = 'Coloniale')
    OR (c.slug = 'universale' AND p.aesthetic = 'Universale')
    OR (c.slug = 'blu-mediterraneo' AND p.theme_key = 'dg_blu_mediterraneo')
    OR (c.slug = 'dolce-gabbana-sicily' AND p.theme_key = 'dg_sicily')
    OR (c.slug = 'divina-cucina' AND p.theme_key = 'dg_divina_cucina')
    OR (c.slug = 'dolce-gabbana' AND p.theme_key LIKE 'dg_%')
    OR (c.slug = 'coca-cola' AND p.theme_key = 'coca_cola')
    OR (c.slug = 'smeg500' AND p.theme_key = 'smeg500')
    OR (c.slug = 'porsche' AND p.theme_key IN ('porsche', 'porsche_green', 'porsche_white', 'porsche_917'))
  )
ON CONFLICT (collection_id, product_sku) DO NOTHING;

-- WKF01 product names: RU «Чайник со свистком», HY «Թեյնիկ սուլիչով»
UPDATE public.products
SET name = regexp_replace(name, '^Свистящий чайник', 'Чайник со свистком')
WHERE sku ILIKE 'WKF01%'
  AND name ~ '^Свистящий чайник';

UPDATE public.products
SET name_hy = regexp_replace(name_hy, '^(Սուզակային թեյնիկ|Սուլող թեյնիկ)', 'Թեյնիկ սուլիչով')
WHERE sku ILIKE 'WKF01%'
  AND name_hy ~ '^(Սուզակային թեյնիկ|Սուլող թեյնիկ)';

-- Fix grouped card label (Armenian spelling)
-- (superseded by 20260704120000 if genitive was applied)
