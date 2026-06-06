CREATE OR REPLACE FUNCTION public.compute_model_group(p_name text, p_family text, p_colour text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  stripped text;
  colour_pat text;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;
  stripped := p_name;
  IF p_colour IS NOT NULL AND p_colour <> '' THEN
    colour_pat := regexp_replace(p_colour, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g');
    -- strip colour wherever it appears (word-boundary-ish), case-insensitive
    stripped := regexp_replace(stripped, '\m' || colour_pat || '\M', '', 'gi');
  END IF;
  stripped := lower(trim(regexp_replace(stripped, '\s+', ' ', 'g')));
  RETURN coalesce(p_family, '') || '|' || stripped;
END;
$function$;

UPDATE public.products SET name = name;