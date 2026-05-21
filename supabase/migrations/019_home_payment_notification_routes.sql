CREATE OR REPLACE FUNCTION process_due_home_payment_schedules()
RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  v_balance DECIMAL := 0;
  v_partner_id UUID;
  v_processed INTEGER := 0;
  v_scope TEXT;
  v_route TEXT;
BEGIN
  FOR r IN
    SELECT *
    FROM home_payment_schedules
    WHERE active = TRUE
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    v_scope := CASE WHEN r.is_couple THEN 'couple' ELSE 'personal' END;
    v_route := '/home/' || r.home_slug || '?scope=' || v_scope || '&schedule=' || r.id::TEXT;

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
        jsonb_build_object(
          'route', v_route,
          'scope', v_scope,
          'schedule_id', r.id,
          'home_slug', r.home_slug,
          'amount', r.amount,
          'balance', COALESCE(v_balance, 0)
        )
      );

      IF r.is_couple THEN
        SELECT partner_id INTO v_partner_id FROM profiles WHERE id = r.user_id;
        IF v_partner_id IS NOT NULL THEN
          PERFORM notify_user(
            v_partner_id,
            'Pago no realizado',
            'No hubo saldo suficiente para ' || r.home_name || ' en la cuenta conjunta.',
            'warning',
            jsonb_build_object(
              'route', v_route,
              'scope', v_scope,
              'schedule_id', r.id,
              'home_slug', r.home_slug,
              'amount', r.amount,
              'balance', COALESCE(v_balance, 0)
            )
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
