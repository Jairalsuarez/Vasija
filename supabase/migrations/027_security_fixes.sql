-- Drop existing insecure SELECT policies
DROP POLICY IF EXISTS "Users can read own movements" ON movements;
DROP POLICY IF EXISTS "Users can read own debts" ON debts;
DROP POLICY IF EXISTS "Users can read own goals" ON goals;
DROP POLICY IF EXISTS "Users can read own savings" ON savings;
DROP POLICY IF EXISTS "Users can update own savings" ON savings;

-- Create secure SELECT policies that check partner_id
CREATE POLICY "Users can read own and partner movements"
  ON movements FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can read own and partner debts"
  ON debts FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can read own and partner goals"
  ON goals FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can read own and partner savings"
  ON savings FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update own and partner savings"
  ON savings FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR (is_couple = TRUE AND user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  );

-- Re-create functions with authorization checks
CREATE OR REPLACE FUNCTION link_couple(user_id UUID, partner_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_partner UUID;
  v_partner_partner UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> user_id AND auth.uid() <> partner_id) THEN
    RAISE EXCEPTION 'No autorizado para realizar esta vinculación';
  END IF;

  IF user_id = partner_id THEN
    RAISE EXCEPTION 'No puedes vincularte contigo mismo';
  END IF;

  SELECT p.partner_id INTO v_user_partner FROM profiles p WHERE p.id = link_couple.user_id;
  SELECT p.partner_id INTO v_partner_partner FROM profiles p WHERE p.id = link_couple.partner_id;

  IF v_user_partner IS NOT NULL THEN
    RAISE EXCEPTION 'Tu cuenta ya está conectada con una pareja';
  END IF;

  IF v_partner_partner IS NOT NULL THEN
    RAISE EXCEPTION 'Ese usuario ya está conectado con una pareja';
  END IF;

  UPDATE profiles SET partner_id = link_couple.partner_id WHERE id = link_couple.user_id;
  UPDATE profiles SET partner_id = link_couple.user_id WHERE id = link_couple.partner_id;

  UPDATE couple_links
  SET partner_id = link_couple.user_id,
      status = 'linked',
      linked_at = NOW()
  WHERE id = (
    SELECT cl.id
    FROM couple_links cl
    WHERE cl.user_id = link_couple.partner_id
      AND cl.status = 'pending'
    ORDER BY cl.created_at DESC
    LIMIT 1
  );

  UPDATE couple_links
  SET status = 'expired'
  WHERE status = 'pending'
    AND user_id IN (link_couple.user_id, link_couple.partner_id);

  v_user1 := LEAST(link_couple.user_id, link_couple.partner_id);
  v_user2 := GREATEST(link_couple.user_id, link_couple.partner_id);

  INSERT INTO couples(user1_id, user2_id)
  VALUES (v_user1, v_user2)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_or_create_joint_account(v_user_id UUID)
RETURNS TABLE (id UUID, balance DECIMAL, account_name TEXT, theme TEXT) AS $$
DECLARE
  v_pid UUID;
  v_cl_id UUID;
  v_ja_id UUID;
  v_ja_balance DECIMAL;
  v_ja_name TEXT;
  v_ja_theme TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT partner_id INTO v_pid FROM profiles WHERE profiles.id = v_user_id;
  IF v_pid IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL, 'Nuestra cuenta'::TEXT, 'default'::TEXT;
    RETURN;
  END IF;

  SELECT current_couple_link_id(v_user_id, v_pid) INTO v_cl_id;
  IF v_cl_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL, 'Nuestra cuenta'::TEXT, 'default'::TEXT;
    RETURN;
  END IF;

  SELECT ja.id, ja.balance, COALESCE(ja.account_name, 'Nuestra cuenta'), COALESCE(ja.theme, 'default')
  INTO v_ja_id, v_ja_balance, v_ja_name, v_ja_theme
  FROM joint_accounts ja
  WHERE ja.couple_id = v_cl_id;

  IF v_ja_id IS NULL THEN
    INSERT INTO joint_accounts (couple_id, balance)
    VALUES (v_cl_id, 0)
    RETURNING joint_accounts.id, joint_accounts.balance, 'Nuestra cuenta'::TEXT, 'default'::TEXT
    INTO v_ja_id, v_ja_balance, v_ja_name, v_ja_theme;
  END IF;

  RETURN QUERY SELECT v_ja_id, COALESCE(v_ja_balance, 0)::DECIMAL, v_ja_name, v_ja_theme;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
  IF auth.uid() IS NULL OR auth.uid() <> from_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION transfer_to_joint(from_user_id UUID, amount DECIMAL, description TEXT DEFAULT 'Transferencia a cuenta conjunta')
RETURNS BOOLEAN AS $$
DECLARE
  ja_id UUID;
  v_pid UUID;
  v_sender_name TEXT;
  v_ja_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> from_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Get joint account
  SELECT g.id INTO ja_id FROM get_or_create_joint_account(from_user_id) AS g;
  IF ja_id IS NULL THEN RETURN FALSE; END IF;

  -- Get account names
  SELECT account_name INTO v_sender_name FROM profiles WHERE id = from_user_id;
  SELECT account_name INTO v_ja_name FROM joint_accounts WHERE id = ja_id;

  -- Use fallback names
  IF v_sender_name IS NULL THEN
    SELECT name INTO v_sender_name FROM profiles WHERE id = from_user_id;
  END IF;
  IF v_ja_name IS NULL THEN v_ja_name := 'Nuestra cuenta'; END IF;

  -- Insert personal movement (type transfer_to_joint, is_couple=false)
  INSERT INTO movements (user_id, type, amount, description, category, date, is_couple)
  VALUES (from_user_id, 'transfer_to_joint', amount, 'Transferiste a ' || v_ja_name, 'transferencia', CURRENT_DATE, false);

  -- Get partner id
  SELECT partner_id INTO v_pid FROM profiles WHERE id = from_user_id;

  -- Insert joint movement (type income, is_couple=true) so it shows in couple view
  INSERT INTO movements (user_id, type, amount, description, category, date, is_couple)
  VALUES (from_user_id, 'income', amount, 'Transferencia de ' || v_sender_name, 'transferencia', CURRENT_DATE, true);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION pay_debt_installment(debt_id UUID, amount DECIMAL)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_is_couple BOOLEAN;
  v_partner_id UUID;
BEGIN
  SELECT user_id, is_couple INTO v_user_id, v_is_couple FROM debts WHERE id = debt_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Deuda no encontrada';
  END IF;

  SELECT partner_id INTO v_partner_id FROM profiles WHERE id = v_user_id;

  IF auth.uid() IS NULL OR (auth.uid() <> v_user_id AND (NOT v_is_couple OR auth.uid() <> v_partner_id)) THEN
    RAISE EXCEPTION 'No autorizado para actualizar esta deuda';
  END IF;

  UPDATE debts
  SET
    paid_amount = paid_amount + amount,
    installments_paid = installments_paid + 1
  WHERE id = debt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION contribute_to_goal(goal_id UUID, amount DECIMAL)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_is_couple BOOLEAN;
  v_partner_id UUID;
BEGIN
  SELECT user_id, is_couple INTO v_user_id, v_is_couple FROM goals WHERE id = goal_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Meta no encontrada';
  END IF;

  SELECT partner_id INTO v_partner_id FROM profiles WHERE id = v_user_id;

  IF auth.uid() IS NULL OR (auth.uid() <> v_user_id AND (NOT v_is_couple OR auth.uid() <> v_partner_id)) THEN
    RAISE EXCEPTION 'No autorizado para actualizar esta meta';
  END IF;

  UPDATE goals
  SET current_amount = current_amount + amount
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION update_joint_account_theme(p_joint_account_id UUID, p_theme TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE ja.id = p_joint_account_id
      AND (cl.user_id = auth.uid() OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE joint_accounts SET theme = p_theme WHERE id = p_joint_account_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION propose_name_change(
  p_joint_account_id UUID,
  p_proposed_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing UUID;
  v_requester UUID;
BEGIN
  SELECT auth.uid() INTO v_requester;

  IF v_requester IS NULL OR NOT EXISTS (
    SELECT 1 FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE ja.id = p_joint_account_id
      AND (cl.user_id = v_requester OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = v_requester))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  SELECT id INTO v_existing FROM name_change_requests
  WHERE joint_account_id = p_joint_account_id AND status = 'pending'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya hay una solicitud de cambio pendiente');
  END IF;

  INSERT INTO name_change_requests (joint_account_id, requester_id, proposed_name)
  VALUES (p_joint_account_id, v_requester, p_proposed_name);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION respond_name_change(
  p_request_id UUID,
  p_accept BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_joint_account_id UUID;
  v_proposed_name TEXT;
  v_requester_id UUID;
  v_responder UUID;
BEGIN
  SELECT auth.uid() INTO v_responder;

  SELECT joint_account_id, proposed_name, requester_id
  INTO v_joint_account_id, v_proposed_name, v_requester_id
  FROM name_change_requests WHERE id = p_request_id AND status = 'pending';

  IF v_joint_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada');
  END IF;

  IF v_responder IS NULL OR NOT EXISTS (
    SELECT 1 FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE ja.id = v_joint_account_id
      AND (cl.user_id = v_responder OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = v_responder))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  IF v_requester_id = v_responder THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes responder tu propia solicitud');
  END IF;

  IF p_accept THEN
    UPDATE joint_accounts SET account_name = v_proposed_name WHERE id = v_joint_account_id;
    UPDATE name_change_requests SET status = 'accepted', responded_at = NOW() WHERE id = p_request_id;
  ELSE
    UPDATE name_change_requests SET status = 'rejected', responded_at = NOW() WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_name_change(p_joint_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1 FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE ja.id = p_joint_account_id
      AND (cl.user_id = v_caller OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = v_caller))
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'requester_id', requester_id,
    'proposed_name', proposed_name,
    'created_at', created_at
  ) INTO v_result
  FROM name_change_requests
  WHERE joint_account_id = p_joint_account_id AND status = 'pending'
  LIMIT 1;

  RETURN v_result;
END;
$$;

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
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    -- Check if they are partners
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id AND partner_id = v_caller
    ) THEN
      RAISE EXCEPTION 'No autorizado para enviar notificaciones a este usuario';
    END IF;
  END IF;

  INSERT INTO app_notifications (user_id, title, body, type, metadata)
  VALUES (p_user_id, p_title, p_body, p_type, COALESCE(p_metadata, '{}'::JSONB))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
