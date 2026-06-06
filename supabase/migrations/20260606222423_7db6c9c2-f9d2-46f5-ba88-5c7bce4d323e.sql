INSERT INTO public.themes (key, name, background_image, background_color, accent_color, card_bg, description) VALUES
('porsche_green', 'Porsche Shade Green', '/__l5e/assets-v1/d01c12cd-6bbd-4f87-9c5f-b1d982cb69c1/porsche-green.jpg', '#9eb39a', '#1a1a1a', '#ffffff', 'Shade Green коллекции Porsche × Smeg'),
('porsche_white', 'Porsche Carrara White', '/__l5e/assets-v1/a1ec413a-8ad3-40b1-bb83-3412363a87b5/porsche-white.jpg', '#ecebe6', '#1a1a1a', '#ffffff', 'Carrara White коллекции Porsche × Smeg')
ON CONFLICT (key) DO UPDATE SET background_image=EXCLUDED.background_image, background_color=EXCLUDED.background_color, accent_color=EXCLUDED.accent_color, name=EXCLUDED.name, description=EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.compute_theme_key(p_name text, p_aesthetic text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_name ~* 'sicily is my love' THEN 'dg_sicily'
    WHEN p_name ~* 'blu mediterraneo'  THEN 'dg_blu_mediterraneo'
    WHEN p_name ~* 'divina cucina'     THEN 'dg_divina_cucina'
    WHEN p_name ~* 'dolce.{0,3}gabbana' THEN 'dg_sicily'
    WHEN p_name ~* 'coca.?cola'        THEN 'coca_cola'
    WHEN p_name ~* '(smeg500|fiat\s*500)' THEN 'smeg500'
    WHEN p_name ~* '917'               THEN 'porsche_917'
    WHEN p_name ~* 'porsche'
      AND p_name ~* '(shade green|psg)' THEN 'porsche_green'
    WHEN p_name ~* 'porsche'
      AND p_name ~* '(carrara|white|pcw)' THEN 'porsche_white'
    WHEN p_name ~* 'porsche'           THEN 'porsche'
    ELSE NULL
  END
$function$;

UPDATE public.products SET theme_key = public.compute_theme_key(name, aesthetic);