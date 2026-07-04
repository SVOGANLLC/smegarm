-- Public news feed (admin-managed, Smeg-style list page).

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_en text,
  title_hy text,
  excerpt text,
  excerpt_en text,
  excerpt_hy text,
  image_url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_published
  ON public.news (is_published, published_at DESC);

GRANT SELECT ON public.news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published news" ON public.news;
CREATE POLICY "Anyone can view published news"
  ON public.news FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins read all news" ON public.news;
CREATE POLICY "Admins read all news"
  ON public.news FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage news" ON public.news;
CREATE POLICY "Admins manage news"
  ON public.news FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_news_updated_at ON public.news;
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a few Smeg-style stories (admin can edit / add more).
INSERT INTO public.news (slug, title, title_en, title_hy, excerpt, excerpt_en, excerpt_hy, image_url, published_at, is_published, sort_order)
VALUES
(
  'moonlight-collection',
  'Коллекция Moonlight: новый матовый финиш',
  'Moonlight Collection: a new matt finish',
  'Moonlight հավաքածու՝ նոր փայլատ ծածկույթ',
  'Smeg представляет коллекцию Moonlight — спокойные матовые оттенки и фирменный силуэт 50''s Style для современной кухни.',
  'Smeg introduces the Moonlight Collection — calm matt tones and the iconic 50''s Style silhouette for the modern kitchen.',
  'Smeg-ը ներկայացնում է Moonlight հավաքածուն՝ հանգիստ փայլատ երանգներ և 50''s Style սիլուետ ժամանակակից խոհանոցի համար։',
  'https://www.smeg.com/binaries/content/gallery/smeg/stories/marchio-globale-1.jpg/marchio-globale-1.jpg',
  '2026-03-01T10:00:00Z',
  true,
  30
),
(
  'smegconnect',
  'SmegConnect: кухня, которой можно управлять',
  'SmegConnect: a kitchen you can control',
  'SmegConnect՝ խոհանոց, որը կարելի է կառավարել',
  'Подключаемые приборы SmegConnect позволяют следить за готовкой и управлять техникой со смартфона — удобно и безопасно.',
  'SmegConnect appliances let you monitor cooking and control devices from your phone — convenient and safe.',
  'SmegConnect սարքերը թույլ են տալիս հետևել պատրաստմանը և կառավարել տեխնիկան հեռախոսից՝ հարմար և անվտանգ։',
  'https://www.smeg.com/binaries/content/gallery/smeg/stories/1smegconnect_news1.jpg/1smegconnect_news1.jpg',
  '2026-02-10T10:00:00Z',
  true,
  20
),
(
  'milk-frother',
  'Вспениватель молока Smeg: бариста дома',
  'Smeg milk frother: barista at home',
  'Smeg կաթի փրփրացուցիչ՝ բարիստա տանը',
  'Плотный молочный крем для капучино и латте — с фирменным дизайном Smeg и простым управлением.',
  'Dense milk foam for cappuccino and latte — with signature Smeg design and simple controls.',
  'Խիտ կաթնային փրփուր կապուչինոյի և լատեի համար՝ Smeg դիզայնով և պարզ կառավարմամբ։',
  'https://www.smeg.com/binaries/content/gallery/smeg/stories/smeg_milk_frother_mff01pbeu_l202_2.jpg/smeg_milk_frother_mff01pbeu_l202_2.jpg',
  '2026-01-15T10:00:00Z',
  true,
  10
)
ON CONFLICT (slug) DO NOTHING;
