CREATE OR REPLACE FUNCTION notify_movement_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_scope TEXT;
  v_route TEXT;
BEGIN
  IF NEW.type = 'income' THEN
    v_title := 'Ingreso registrado';
    v_body := 'Se registro un ingreso de ' || NEW.amount::TEXT || ' en ' || COALESCE(NEW.category, 'General') || '.';
  ELSIF NEW.type = 'expense' THEN
    v_title := 'Gasto registrado';
    v_body := 'Se registro un gasto de ' || NEW.amount::TEXT || ' en ' || COALESCE(NEW.category, 'General') || '.';
  ELSIF NEW.type = 'transfer_to_joint' THEN
    v_title := 'Transferencia registrada';
    v_body := 'Se registro una transferencia de ' || NEW.amount::TEXT || '.';
  ELSE
    v_title := 'Movimiento registrado';
    v_body := 'Se registro un movimiento de ' || NEW.amount::TEXT || '.';
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
      'category', NEW.category
    )
  );

  IF NEW.is_couple THEN
    SELECT partner_id INTO v_partner_id FROM profiles WHERE id = NEW.user_id;
    IF v_partner_id IS NOT NULL THEN
      PERFORM notify_user(
        v_partner_id,
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
          'from_user_id', NEW.user_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
