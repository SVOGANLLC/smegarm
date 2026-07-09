-- Restore higher-resolution theme backgrounds (replaces low-res PNG variants).

UPDATE public.themes SET background_image = '/brand/themes/porsche-green.jpg' WHERE key = 'porsche_green';
UPDATE public.themes SET background_image = '/brand/themes/porsche-white.jpg' WHERE key = 'porsche_white';
UPDATE public.themes SET background_image = '/brand/themes/porsche-salzburg.jpg' WHERE key IN ('porsche_917', 'porsche');
UPDATE public.themes SET background_image = '/brand/themes/dg-sicily.jpg' WHERE key IN ('dg_sicily', 'dg', 'dg_divina_cucina');
