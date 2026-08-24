select cron.schedule(
    'nettoyage-notifications',
    '0 3 * * *',
    $$
        select public.nettoyer_anciennes_notifications();
    $$
);