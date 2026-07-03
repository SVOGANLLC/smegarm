-- theme_key is set at import / manually in DB — do not auto-detect from product name on save.

DROP TRIGGER IF EXISTS trg_products_compute_derived ON public.products;
