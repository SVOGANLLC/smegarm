
-- Normalize remaining Russian color names
UPDATE public.products SET colour = 'Silver' WHERE colour IN ('Серебристый', 'Серебро');

-- Tune Smeg-canonical palette to better match real appliance finishes
UPDATE public.color_swatches SET hex = '#c2dce4' WHERE colour = 'Pastel blue';
UPDATE public.color_swatches SET hex = '#c8dcc5' WHERE colour = 'Pastel green';
UPDATE public.color_swatches SET hex = '#f5b8c4' WHERE colour = 'Pink';
UPDATE public.color_swatches SET hex = '#efe7d2' WHERE colour = 'Cream';
UPDATE public.color_swatches SET hex = '#d3d5d7' WHERE colour = 'Stainless steel';
UPDATE public.color_swatches SET hex = '#d3d5d7' WHERE colour = 'Stainless Steel and Glass';
UPDATE public.color_swatches SET hex = '#bfc1c3' WHERE colour = 'Silver';
UPDATE public.color_swatches SET hex = '#d8dadc' WHERE colour = 'Chrome';
UPDATE public.color_swatches SET hex = '#161616' WHERE colour = 'Black';
UPDATE public.color_swatches SET hex = '#0a0a0a' WHERE colour = 'Matt Black';
UPDATE public.color_swatches SET hex = '#f4f3ee' WHERE colour = 'White';
UPDATE public.color_swatches SET hex = '#ededea' WHERE colour = 'Matt White';
UPDATE public.color_swatches SET hex = '#2d2f33' WHERE colour = 'Anthracite';
UPDATE public.color_swatches SET hex = '#5b6470' WHERE colour = 'Neptune Grey';
UPDATE public.color_swatches SET hex = '#0e6b46' WHERE colour = 'Emerald Green';
UPDATE public.color_swatches SET hex = '#bb0a30' WHERE colour = 'Red';
UPDATE public.color_swatches SET hex = '#e87b1e' WHERE colour = 'Orange';
UPDATE public.color_swatches SET hex = '#f2c84b' WHERE colour = 'Yellow';
UPDATE public.color_swatches SET hex = '#a0a0a0' WHERE colour = 'Inox Look';
UPDATE public.color_swatches SET hex = '#5b6066' WHERE colour = 'Slate Grey';
UPDATE public.color_swatches SET hex = '#314a60' WHERE colour = 'Storm Blue';
UPDATE public.color_swatches SET hex = '#1f2c4a' WHERE colour = 'Navy Blue';
UPDATE public.color_swatches SET hex = '#dccfa6' WHERE colour = 'Oats';
UPDATE public.color_swatches SET hex = '#b59a4a' WHERE colour = 'Brass';
UPDATE public.color_swatches SET hex = '#b87333' WHERE colour = 'Copper';

-- Ensure swatch entries exist for any remaining product colours
INSERT INTO public.color_swatches (colour, hex, sort_order)
SELECT DISTINCT p.colour, '#b8b8b8', 999
FROM public.products p
WHERE p.colour IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.color_swatches s WHERE s.colour = p.colour)
ON CONFLICT (colour) DO NOTHING;
