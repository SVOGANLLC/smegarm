
-- Marketing flags & promo fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_special_offer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_text text,
  ADD COLUMN IF NOT EXISTS price_old integer,
  ADD COLUMN IF NOT EXISTS promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS sort_weight integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products (is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products (is_new) WHERE is_new;
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON public.products (is_bestseller) WHERE is_bestseller;
CREATE INDEX IF NOT EXISTS idx_products_is_special_offer ON public.products (is_special_offer) WHERE is_special_offer;
CREATE INDEX IF NOT EXISTS idx_products_sort_weight ON public.products (sort_weight DESC);

-- Collections (curated)
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  cover_image text,
  is_published boolean NOT NULL DEFAULT true,
  sort_weight integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_public_read"
  ON public.collections FOR SELECT
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "collections_admin_write"
  ON public.collections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Collection <-> Products
CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_sku text NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
  sort_weight integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_sku)
);

GRANT SELECT ON public.collection_products TO anon, authenticated;
GRANT ALL ON public.collection_products TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.collection_products TO authenticated;

ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_products_public_read"
  ON public.collection_products FOR SELECT
  USING (true);

CREATE POLICY "collection_products_admin_write"
  ON public.collection_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON public.collection_products (collection_id, sort_weight DESC);
CREATE INDEX IF NOT EXISTS idx_collection_products_sku ON public.collection_products (product_sku);
