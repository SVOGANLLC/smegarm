
-- 1. Add columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model_group text,
  ADD COLUMN IF NOT EXISTS theme_key text;

CREATE INDEX IF NOT EXISTS idx_products_model_group ON public.products(model_group);
CREATE INDEX IF NOT EXISTS idx_products_theme_key ON public.products(theme_key);
CREATE INDEX IF NOT EXISTS idx_products_colour ON public.products(colour);
CREATE INDEX IF NOT EXISTS idx_products_aesthetic ON public.products(aesthetic);
CREATE INDEX IF NOT EXISTS idx_products_family ON public.products(family);

-- 2. Color swatches table
CREATE TABLE IF NOT EXISTS public.color_swatches (
  colour text PRIMARY KEY,
  hex text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.color_swatches TO anon, authenticated;
GRANT ALL ON public.color_swatches TO service_role;
ALTER TABLE public.color_swatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "color_swatches public read" ON public.color_swatches FOR SELECT USING (true);
CREATE POLICY "color_swatches admin write" ON public.color_swatches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Themes table for collaborations
CREATE TABLE IF NOT EXISTS public.themes (
  key text PRIMARY KEY,
  name text NOT NULL,
  background_image text,
  background_color text,
  accent_color text,
  card_bg text DEFAULT '#ffffff',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themes TO anon, authenticated;
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes public read" ON public.themes FOR SELECT USING (true);
CREATE POLICY "themes admin write" ON public.themes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Compute helpers
CREATE OR REPLACE FUNCTION public.compute_model_group(p_name text, p_family text, p_colour text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  stripped text;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;
  stripped := p_name;
  IF p_colour IS NOT NULL AND p_colour <> '' THEN
    -- strip leading colour word(s) from name, case-insensitive
    stripped := regexp_replace(stripped, '^' || regexp_replace(p_colour, '([\\.\\^\\$\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|])', '\\\1', 'g') || '\s+', '', 'i');
  END IF;
  -- normalize
  stripped := lower(trim(regexp_replace(stripped, '\s+', ' ', 'g')));
  RETURN coalesce(p_family, '') || '|' || stripped;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_theme_key(p_name text, p_aesthetic text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_name ~* 'sicily is my love' THEN 'dg_sicily'
    WHEN p_name ~* 'blu mediterraneo'  THEN 'dg_blu_mediterraneo'
    WHEN p_name ~* 'divina cucina'     THEN 'dg_divina_cucina'
    WHEN p_name ~* 'dolce.{0,3}gabbana' THEN 'dg'
    WHEN p_name ~* 'coca.?cola'        THEN 'coca_cola'
    WHEN p_name ~* '(smeg500|fiat\s*500)' THEN 'smeg500'
    WHEN p_name ~* 'porsche'           THEN 'porsche'
    ELSE NULL
  END
$$;

-- 5. Trigger
CREATE OR REPLACE FUNCTION public.products_compute_derived()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.model_group := public.compute_model_group(NEW.name, NEW.family, NEW.colour);
  NEW.theme_key := COALESCE(NEW.theme_key, public.compute_theme_key(NEW.name, NEW.aesthetic));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_compute_derived ON public.products;
CREATE TRIGGER trg_products_compute_derived
BEFORE INSERT OR UPDATE OF name, family, colour, aesthetic ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_compute_derived();

-- 6. Backfill
UPDATE public.products
SET model_group = public.compute_model_group(name, family, colour),
    theme_key = public.compute_theme_key(name, aesthetic);

-- 7. Seed color swatches (common Smeg palette)
INSERT INTO public.color_swatches (colour, hex, sort_order) VALUES
  ('White', '#f5f5f0', 10),
  ('Cream', '#f0e6cf', 15),
  ('Black', '#1a1a1a', 20),
  ('Matt Black', '#0f0f0f', 22),
  ('Red', '#c8102e', 30),
  ('Ruby Red', '#9b1c2c', 32),
  ('Pink', '#f3b5c3', 40),
  ('Pastel blue', '#a8c8d8', 50),
  ('Pastel green', '#b8d4b8', 55),
  ('Emerald Green', '#1e6b4f', 58),
  ('Sea Salt Green', '#9bb8a6', 59),
  ('Navy Blue', '#1f2c4a', 60),
  ('Storm Blue', '#3a5266', 62),
  ('Orange', '#e87b1e', 70),
  ('Yellow', '#f2c84b', 75),
  ('Olive green', '#7c8a4a', 78),
  ('Turquese', '#3fb5b5', 80),
  ('Anthracite', '#3a3a3a', 90),
  ('Silver', '#c8c8c8', 100),
  ('Stainless steel', '#b8b8b8', 105),
  ('Chrome', '#cfcfcf', 108),
  ('Champagne', '#d4be9b', 110),
  ('Moonlight', '#b9c2c8', 115),
  ('Copper', '#b87333', 120),
  ('Brass', '#b59a4a', 125),
  ('Oak', '#a47855', 130),
  ('Grey', '#8a8a8a', 140),
  ('Slate Grey', '#5a6470', 142),
  ('Neptune Grey', '#5e6770', 144),
  ('Dark Inox', '#4a4a4a', 150),
  ('Dark Inox Look', '#4a4a4a', 151),
  ('Inox Look', '#a0a0a0', 152),
  ('Black Inox Look', '#2a2a2a', 153),
  ('Dark Grey Inox Look', '#3a3a3a', 154),
  ('Marble look', '#e8e4dc', 160),
  ('Perfectly Pale', '#e8dccf', 165),
  ('Taupe', '#8a7a6a', 170),
  ('Rust', '#a04a2a', 175),
  ('Lime green', '#a8c83a', 180),
  ('Green', '#3a8a4a', 185),
  ('Blue', '#2a5aa8', 190),
  ('Decorated / Special', '#d4af7a', 999)
ON CONFLICT (colour) DO UPDATE SET hex = EXCLUDED.hex, sort_order = EXCLUDED.sort_order;

-- 8. Seed themes
INSERT INTO public.themes (key, name, background_color, accent_color, card_bg, description) VALUES
  ('dg', 'Smeg × Dolce&Gabbana', '#f5e6c4', '#0a4d2c', '#ffffff', 'Итальянская роскошь и ремесленный декор'),
  ('dg_sicily', 'Sicily is my Love', '#fff5cc', '#c8102e', '#ffffff', 'Сицилийская майолика, лимоны и керамика'),
  ('dg_blu_mediterraneo', 'Blu Mediterraneo', '#cfe3ec', '#1f4e7a', '#ffffff', 'Лазурь Средиземноморья'),
  ('dg_divina_cucina', 'Divina Cucina', '#f0e0d0', '#7a2030', '#ffffff', 'Барочный ренессанс'),
  ('coca_cola', 'Smeg × Coca-Cola', '#e7142d', '#ffffff', '#ffffff', 'Культовый красный'),
  ('smeg500', 'Smeg500 (Fiat 500)', '#e8e2d6', '#c8102e', '#ffffff', 'Икона итальянского дизайна'),
  ('porsche', 'Porsche Design', '#1a1a1a', '#c0c0c0', '#f5f5f5', 'Графит и точность инженерии')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;
