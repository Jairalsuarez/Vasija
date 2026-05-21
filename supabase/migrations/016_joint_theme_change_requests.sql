CREATE TABLE IF NOT EXISTS theme_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_account_id UUID REFERENCES joint_accounts(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_theme TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE theme_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view theme requests for their couple" ON theme_change_requests;
CREATE POLICY "Users view theme requests for their couple"
ON theme_change_requests FOR SELECT
USING (
  requester_id = auth.uid() OR
  joint_account_id IN (
    SELECT ja.id
    FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE cl.user_id = auth.uid()
       OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users insert own theme requests" ON theme_change_requests;
CREATE POLICY "Users insert own theme requests"
ON theme_change_requests FOR INSERT
WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users update theme requests for their couple" ON theme_change_requests;
CREATE POLICY "Users update theme requests for their couple"
ON theme_change_requests FOR UPDATE
USING (
  joint_account_id IN (
    SELECT ja.id
    FROM joint_accounts ja
    JOIN couple_links cl ON cl.id = ja.couple_id
    WHERE cl.user_id = auth.uid()
       OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION propose_theme_change(
  p_joint_account_id UUID,
  p_proposed_theme TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_requester UUID := auth.uid();
BEGIN
  IF v_requester IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  SELECT id INTO v_existing
  FROM theme_change_requests
  WHERE joint_account_id = p_joint_account_id AND status = 'pending'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya hay una solicitud de color pendiente');
  END IF;

  INSERT INTO theme_change_requests (joint_account_id, requester_id, proposed_theme)
  VALUES (p_joint_account_id, v_requester, p_proposed_theme);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION respond_theme_change(
  p_request_id UUID,
  p_accept BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_joint_account_id UUID;
  v_proposed_theme TEXT;
  v_requester_id UUID;
  v_responder UUID := auth.uid();
  v_responder_name TEXT;
BEGIN
  SELECT joint_account_id, proposed_theme, requester_id
  INTO v_joint_account_id, v_proposed_theme, v_requester_id
  FROM theme_change_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_joint_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada');
  END IF;

  IF v_requester_id = v_responder THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes responder tu propia solicitud');
  END IF;

  IF p_accept THEN
    UPDATE joint_accounts SET theme = v_proposed_theme WHERE id = v_joint_account_id;
    UPDATE theme_change_requests SET status = 'accepted', responded_at = NOW() WHERE id = p_request_id;
  ELSE
    UPDATE theme_change_requests SET status = 'rejected', responded_at = NOW() WHERE id = p_request_id;
  END IF;

  SELECT COALESCE(account_name, name, 'Tu pareja') INTO v_responder_name
  FROM profiles
  WHERE id = v_responder;

  PERFORM notify_user(
    v_requester_id,
    CASE WHEN p_accept THEN 'Color aceptado' ELSE 'Color rechazado' END,
    v_responder_name || CASE WHEN p_accept THEN ' acepto el cambio de color.' ELSE ' rechazo el cambio de color.' END,
    CASE WHEN p_accept THEN 'success' ELSE 'warning' END,
    jsonb_build_object('scope', 'couple', 'route', '/accounts?type=joint&focus=color-request', 'theme_change_request_id', p_request_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_theme_change(p_joint_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'requester_id', requester_id,
    'proposed_theme', proposed_theme,
    'created_at', created_at
  ) INTO v_result
  FROM theme_change_requests
  WHERE joint_account_id = p_joint_account_id AND status = 'pending'
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION notify_theme_change_request()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT partner_id, COALESCE(account_name, name, 'Tu pareja')
  INTO v_partner_id, v_sender_name
  FROM profiles
  WHERE id = NEW.requester_id;

  IF v_partner_id IS NOT NULL THEN
    PERFORM notify_user(
      v_partner_id,
      'Solicitud de color',
      v_sender_name || ' quiere cambiar el color de la cuenta.',
      'info',
      jsonb_build_object(
        'scope', 'couple',
        'route', '/accounts?type=joint&focus=color-request',
        'theme_change_request_id', NEW.id,
        'joint_account_id', NEW.joint_account_id,
        'proposed_theme', NEW.proposed_theme
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS theme_change_request_notifications ON theme_change_requests;
CREATE TRIGGER theme_change_request_notifications
AFTER INSERT ON theme_change_requests
FOR EACH ROW
EXECUTE FUNCTION notify_theme_change_request();

CREATE OR REPLACE FUNCTION respond_name_change(
  p_request_id UUID,
  p_accept BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_joint_account_id UUID;
  v_proposed_name TEXT;
  v_requester_id UUID;
  v_responder UUID := auth.uid();
  v_responder_name TEXT;
BEGIN
  SELECT joint_account_id, proposed_name, requester_id
  INTO v_joint_account_id, v_proposed_name, v_requester_id
  FROM name_change_requests WHERE id = p_request_id AND status = 'pending';

  IF v_joint_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada');
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

  SELECT COALESCE(account_name, name, 'Tu pareja') INTO v_responder_name
  FROM profiles
  WHERE id = v_responder;

  PERFORM notify_user(
    v_requester_id,
    CASE WHEN p_accept THEN 'Nombre aceptado' ELSE 'Nombre rechazado' END,
    v_responder_name || CASE WHEN p_accept THEN ' acepto el cambio de nombre.' ELSE ' rechazo el cambio de nombre.' END,
    CASE WHEN p_accept THEN 'success' ELSE 'warning' END,
    jsonb_build_object('scope', 'couple', 'route', '/accounts?type=joint&focus=name-request', 'name_change_request_id', p_request_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
