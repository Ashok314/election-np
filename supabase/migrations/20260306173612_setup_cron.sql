-- Enable pg_cron extension (must be done in Supabase Dashboard > Extensions first)
-- Then schedule the scrape-ecn function every 5 minutes

select cron.schedule(
  'scrape-ecn-every-5-min',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/scrape-ecn',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'
    );
  $$
);
