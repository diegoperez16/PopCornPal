-- push_subscriptions: store Web Push endpoints per user
-- Run this in your Supabase SQL editor.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);

-- ─── OPTIONAL: DB trigger to call the Edge Function on new notifications ───
-- Requires pg_net extension (enabled in Supabase by default).
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> with your actual values,
-- or set them as database settings via: ALTER DATABASE postgres SET app.xxx = '...';
--
-- CREATE OR REPLACE FUNCTION notify_push_subscribers()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   PERFORM net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body    := jsonb_build_object('user_id', NEW.user_id, 'notification_id', NEW.id)
--   );
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER on_notification_created
--   AFTER INSERT ON notifications
--   FOR EACH ROW EXECUTE FUNCTION notify_push_subscribers();
