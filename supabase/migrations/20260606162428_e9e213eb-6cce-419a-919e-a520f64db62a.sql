CREATE TABLE public.products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  aesthetic TEXT,
  colour TEXT,
  family TEXT,
  ean TEXT,
  description TEXT,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  main_image TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  pdf TEXT,
  energy_label TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

CREATE INDEX products_category_idx ON public.products(category);
CREATE INDEX products_family_idx ON public.products(family);
CREATE INDEX products_aesthetic_idx ON public.products(aesthetic);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();