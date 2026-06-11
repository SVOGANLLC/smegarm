SELECT cron.unschedule('translate-products-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='translate-products-tick');

SELECT cron.schedule(
  'translate-products-tick',
  '* * * * *',
  $$
  SELECT net.http_get(
    url := 'https://project--aac8c977-256a-455c-94b2-372a50536b44.lovable.app/api/public/translate/tick?s=QpeflmsorkYgZ0McMJmSvAGXYlPISqgGASOsGvCYukA&limit=3',
    timeout_milliseconds := 55000
  );
  $$
);