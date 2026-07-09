-- Use user-uploaded theme backgrounds (PNG scenes), not legacy JPG patterns.

UPDATE public.themes SET background_image = '/brand/themes/porsche-green.png' WHERE key = 'porsche_green';
UPDATE public.themes SET background_image = '/brand/themes/porsche-white.png' WHERE key = 'porsche_white';
UPDATE public.themes SET background_image = '/brand/themes/porsche-red.png' WHERE key IN ('porsche_917', 'porsche');
UPDATE public.themes SET background_image = '/brand/themes/dg-blu.png' WHERE key = 'dg_blu_mediterraneo';
UPDATE public.themes SET background_image = '/brand/themes/dg-sicily.png' WHERE key IN ('dg_sicily', 'dg', 'dg_divina_cucina');
