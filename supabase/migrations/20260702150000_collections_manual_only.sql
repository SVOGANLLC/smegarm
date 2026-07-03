-- Collections are curated manually in admin. Disable auto-membership sync.
DROP TRIGGER IF EXISTS trg_sync_product_collections ON public.products;

-- Legacy Lovable translation cron (every minute) — not used on self-hosted stack.
SELECT cron.unschedule('translate-products-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'translate-products-tick');
