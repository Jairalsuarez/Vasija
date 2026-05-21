CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS home_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_slug TEXT NOT NULL,
  home_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  due_time TIME NOT NULL DEFAULT '08:00',
  next_run_at TIMESTAMPTZ NOT NULL,
  is_couple BOOLEAN NOT NULL DEFAULT FALSE,
  remind BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_payment_schedules_due
ON home_payment_schedules (active, next_run_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_home_payment_schedules_user_slug_mode
ON home_payment_schedules (user_id, home_slug, is_couple)
WHERE active = TRUE;

ALTER TABLE home_payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own home payment schedules" ON home_payment_schedules;
CREATE POLICY "Users manage own home payment schedules"
ON home_payment_schedules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
ON app_notifications (user_id, created_at DESC);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON app_notifications;
CREATE POLICY "Users read own notifications"
ON app_notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON app_notifications;
CREATE POLICY "Users update own notifications"
ON app_notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION upsert_home_payment_schedule(
  p_home_slug TEXT,
  p_home_name TEXT,
  p_amount DECIMAL,
  p_due_date DATE,
  p_due_time TIME,
  p_is_couple BOOLEAN,
  p_remind BOOLEAN
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_schedule_id UUID;
  v_next_run_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Monto invalido';
  END IF;

  v_next_run_at := (p_due_date::TEXT || ' ' || p_due_time::TEXT)::TIMESTAMPTZ;

  INSERT INTO home_payment_schedules (
    user_id,
    home_slug,
    home_name,
    amount,
    due_date,
    due_time,
    next_run_at,
    is_couple,
    remind,
    active,
    last_error,
    updated_at
  )
  VALUES (
    v_user_id,
    p_home_slug,
    p_home_name,
    p_amount,
    p_due_date,
    p_due_time,
    v_next_run_at,
    p_is_couple,
    p_remind,
    TRUE,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id, home_slug, is_couple) WHERE active = TRUE
  DO UPDATE SET
    home_name = EXCLUDED.home_name,
    amount = EXCLUDED.amount,
    due_date = EXCLUDED.due_date,
    due_time = EXCLUDED.due_time,
    next_run_at = EXCLUDED.next_run_at,
    remind = EXCLUDED.remind,
    last_error = NULL,
    updated_at = NOW()
  RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO app_notifications (user_id, title, body, type, metadata)
  VALUES (p_user_id, p_title, p_body, p_type, COALESCE(p_metadata, '{}'::JSONB))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_due_home_payment_schedules()
RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  v_balance DECIMAL := 0;
  v_partner_id UUID;
  v_processed INTEGER := 0;
BEGIN
  FOR r IN
    SELECT *
    FROM home_payment_schedules
    WHERE active = TRUE
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    IF r.is_couple THEN
      SELECT balance INTO v_balance
      FROM get_or_create_joint_account(r.user_id)
      LIMIT 1;
    ELSE
      SELECT get_user_balance(r.user_id) INTO v_balance;
    END IF;

    IF COALESCE(v_balance, 0) < r.amount THEN
      UPDATE home_payment_schedules
      SET
        active = FALSE,
        last_run_at = NOW(),
        last_error = 'Saldo insuficiente',
        updated_at = NOW()
      WHERE id = r.id;

      PERFORM notify_user(
        r.user_id,
        'Pago no realizado',
        'No hubo saldo suficiente para ' || r.home_name || '. Disponible: ' || COALESCE(v_balance, 0)::TEXT || '.',
        'warning',
        jsonb_build_object('schedule_id', r.id, 'home_slug', r.home_slug, 'amount', r.amount, 'balance', COALESCE(v_balance, 0))
      );

      IF r.is_couple THEN
        SELECT partner_id INTO v_partner_id FROM profiles WHERE id = r.user_id;
        IF v_partner_id IS NOT NULL THEN
          PERFORM notify_user(
            v_partner_id,
            'Pago no realizado',
            'No hubo saldo suficiente para ' || r.home_name || ' en la cuenta conjunta.',
            'warning',
            jsonb_build_object('schedule_id', r.id, 'home_slug', r.home_slug, 'amount', r.amount, 'balance', COALESCE(v_balance, 0))
          );
        END IF;
      END IF;
    ELSE
      INSERT INTO movements (
        user_id,
        type,
        amount,
        description,
        category,
        date,
        is_couple
      )
      VALUES (
        r.user_id,
        'expense',
        r.amount,
        r.home_name || ': Pago automatico',
        'Hogar',
        CURRENT_DATE,
        r.is_couple
      );

      UPDATE home_payment_schedules
      SET
        active = FALSE,
        last_run_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      WHERE id = r.id;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-home-payments-every-minute') THEN
      PERFORM cron.schedule(
        'process-home-payments-every-minute',
        '* * * * *',
        'SELECT process_due_home_payment_schedules();'
      );
    END IF;
  END IF;
END $$;
