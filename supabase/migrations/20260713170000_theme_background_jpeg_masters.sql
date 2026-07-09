-- Point Porsche themes at high-quality JPEG masters (with @2x retina siblings in /brand/themes/).

UPDATE public.themes SET background_image = '/brand/themes/porsche-green.jpg' WHERE key = 'porsche_green';
UPDATE public.themes SET background_image = '/brand/themes/porsche-white.jpg' WHERE key = 'porsche_white';
UPDATE public.themes SET background_image = '/brand/themes/porsche-red.jpg' WHERE key IN ('porsche_917', 'porsche');
