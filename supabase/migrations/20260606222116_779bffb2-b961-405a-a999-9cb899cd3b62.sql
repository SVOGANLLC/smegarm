INSERT INTO public.themes (key, name, background_image, background_color, accent_color, card_bg, description)
VALUES ('porsche_917', 'Porsche 917 Salzburg', '/__l5e/assets-v1/d2d7307c-65c2-4a0c-81f8-927d9c0b9a89/porsche-salzburg.jpg', '#f6f4ef', '#c8102e', '#ffffff', 'Ливрея гоночного болида 917 Salzburg')
ON CONFLICT (key) DO UPDATE SET background_image=EXCLUDED.background_image, background_color=EXCLUDED.background_color, accent_color=EXCLUDED.accent_color, card_bg=EXCLUDED.card_bg, name=EXCLUDED.name, description=EXCLUDED.description;

UPDATE public.themes SET 
  background_image='/__l5e/assets-v1/0b5f5011-3e0c-4b04-a9fa-e84a433d8b64/porsche-classic.jpg',
  background_color='#f4f1ec',
  accent_color='#1a1a1a',
  card_bg='#ffffff',
  description='Минимализм инженерной точности'
WHERE key='porsche';

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
    WHEN p_name ~* 'dolce.{0,3}gabbana' THEN 'dg'
    WHEN p_name ~* 'coca.?cola'        THEN 'coca_cola'
    WHEN p_name ~* '(smeg500|fiat\s*500)' THEN 'smeg500'
    WHEN p_name ~* '917'               THEN 'porsche_917'
    WHEN p_name ~* 'porsche'           THEN 'porsche'
    ELSE NULL
  END
$function$;

-- recompute theme_key for all products
UPDATE public.products SET theme_key = public.compute_theme_key(name, aesthetic);