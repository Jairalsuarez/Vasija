CREATE OR REPLACE FUNCTION transfer_to_partner(
  from_user_id UUID,
  amount DECIMAL,
  description TEXT DEFAULT 'Transferencia a mi pareja'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_partner_id UUID;
  v_sender_name TEXT;
BEGIN
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  SELECT partner_id, COALESCE(account_name, name)
  INTO v_partner_id, v_sender_name
  FROM profiles
  WHERE id = from_user_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No hay pareja conectada';
  END IF;

  INSERT INTO movements (user_id, type, amount, description, category, date, is_couple)
  VALUES (from_user_id, 'transfer_to_joint', amount, description, 'transferencia', CURRENT_DATE, false);

  INSERT INTO movements (user_id, type, amount, description, category, date, is_couple)
  VALUES (v_partner_id, 'income', amount, 'Transferencia de ' || COALESCE(v_sender_name, 'Mi pareja'), 'transferencia', CURRENT_DATE, false);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
