CREATE OR REPLACE FUNCTION notify_movement_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_partner_title TEXT;
  v_partner_body TEXT;
  v_scope TEXT;
  v_route TEXT;
  v_actor_label TEXT;
  v_subject TEXT;
BEGIN
  v_subject := COALESCE(NULLIF(NEW.description, ''), NULLIF(NEW.category, ''), 'General');

  IF NEW.type = 'income' THEN
    v_title := 'Ingreso registrado';
    v_body := 'Registraste un ingreso de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
  ELSIF NEW.type = 'expense' THEN
    v_title := 'Gasto registrado';
    v_body := 'Registraste un gasto de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
  ELSIF NEW.type = 'tithe' THEN
    v_title := 'Pago de diezmo';
    v_body := 'Registraste un pago de diezmo de ' || NEW.amount::TEXT || '.';
  ELSIF NEW.type = 'transfer_to_joint' THEN
    v_title := 'Transferencia registrada';
    v_body := 'Registraste una transferencia de ' || NEW.amount::TEXT || '.';
  ELSE
    v_title := 'Movimiento registrado';
    v_body := 'Registraste un movimiento de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
  END IF;

  v_scope := CASE WHEN NEW.is_couple THEN 'couple' ELSE 'personal' END;
  v_route := '/movements?movement=' || NEW.id::TEXT || '&scope=' || v_scope;

  PERFORM notify_user(
    NEW.user_id,
    v_title,
    v_body,
    CASE WHEN NEW.type = 'expense' THEN 'warning' ELSE 'info' END,
    jsonb_build_object(
      'route', v_route,
      'movement_id', NEW.id,
      'scope', v_scope,
      'type', NEW.type,
      'amount', NEW.amount,
      'category', NEW.category,
      'description', NEW.description
    )
  );

  IF NEW.is_couple THEN
    SELECT partner_id INTO v_partner_id
    FROM profiles
    WHERE id = NEW.user_id;

    IF v_partner_id IS NOT NULL THEN
      SELECT COALESCE(NULLIF(receiver.partner_alias, ''), sender.name, 'Tu pareja')
      INTO v_actor_label
      FROM profiles sender
      LEFT JOIN profiles receiver ON receiver.id = v_partner_id
      WHERE sender.id = NEW.user_id;

      IF NEW.type = 'income' THEN
        v_partner_title := v_actor_label || ' registro un ingreso';
        v_partner_body := v_actor_label || ' registro un ingreso de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
      ELSIF NEW.type = 'expense' THEN
        v_partner_title := v_actor_label || ' registro un gasto';
        v_partner_body := v_actor_label || ' registro un gasto de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
      ELSIF NEW.type = 'tithe' THEN
        v_partner_title := v_actor_label || ' pago diezmo';
        v_partner_body := v_actor_label || ' pago un diezmo de ' || NEW.amount::TEXT || '.';
      ELSIF NEW.type = 'transfer_to_joint' THEN
        v_partner_title := v_actor_label || ' hizo una transferencia';
        v_partner_body := v_actor_label || ' hizo una transferencia de ' || NEW.amount::TEXT || '.';
      ELSE
        v_partner_title := v_actor_label || ' registro un movimiento';
        v_partner_body := v_actor_label || ' registro un movimiento de ' || NEW.amount::TEXT || ' en ' || v_subject || '.';
      END IF;

      PERFORM notify_user(
        v_partner_id,
        v_partner_title,
        v_partner_body,
        CASE WHEN NEW.type = 'expense' THEN 'warning' ELSE 'info' END,
        jsonb_build_object(
          'route', v_route,
          'movement_id', NEW.id,
          'scope', v_scope,
          'type', NEW.type,
          'amount', NEW.amount,
          'category', NEW.category,
          'description', NEW.description,
          'from_user_id', NEW.user_id,
          'from_label', v_actor_label
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
