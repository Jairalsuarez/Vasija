-- Drop functions first since we're changing their return types
DROP FUNCTION IF EXISTS get_or_create_joint_account(UUID);
DROP FUNCTION IF EXISTS get_partner_info(UUID);
DROP FUNCTION IF EXISTS transfer_to_joint(UUID, DECIMAL, TEXT);

-- Recreate get_or_create_joint_account to also return account_name and theme (bypasses RLS)
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
  SELECT partner_id INTO v_pid FROM profiles WHERE profiles.id = v_user_id;
  IF v_pid IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL, 'Nuestra cuenta'::TEXT, 'default'::TEXT;
    RETURN;
  END IF;
  SELECT cl.id INTO v_cl_id
  FROM couple_links cl
  WHERE cl.user_id IN (v_user_id, v_pid)
  LIMIT 1;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Account naming columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_alias TEXT;

ALTER TABLE joint_accounts ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT 'Nuestra cuenta';

-- Name change request tracking
CREATE TABLE IF NOT EXISTS name_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_account_id UUID REFERENCES joint_accounts(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE name_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view name change requests for their couple" ON name_change_requests;
CREATE POLICY "Users can view name change requests for their couple"
  ON name_change_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    joint_account_id IN (
      SELECT ja.id FROM joint_accounts ja
      JOIN couple_links cl ON cl.id = ja.couple_id
      WHERE cl.user_id = auth.uid()
         OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own name change requests" ON name_change_requests;
CREATE POLICY "Users can insert their own name change requests"
  ON name_change_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can update name change requests for their couple" ON name_change_requests;
CREATE POLICY "Users can update name change requests for their couple"
  ON name_change_requests FOR UPDATE
  USING (
    joint_account_id IN (
      SELECT ja.id FROM joint_accounts ja
      JOIN couple_links cl ON cl.id = ja.couple_id
      WHERE cl.user_id = auth.uid()
         OR cl.user_id = (SELECT partner_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RPC to propose a name change for the joint account
CREATE OR REPLACE FUNCTION propose_name_change(
  p_joint_account_id UUID,
  p_proposed_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_requester UUID;
BEGIN
  SELECT auth.uid() INTO v_requester;

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

-- RPC to respond to a name change request
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
  v_responder UUID;
BEGIN
  SELECT auth.uid() INTO v_responder;

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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC to get pending name change request for a joint account
CREATE OR REPLACE FUNCTION get_pending_name_change(p_joint_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
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

-- Update get_partner_info to also return partner_alias
CREATE OR REPLACE FUNCTION get_partner_info(v_partner_id UUID)
RETURNS TABLE (name TEXT, avatar_url TEXT, partner_alias TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, p.avatar_url, p.partner_alias
  FROM profiles p
  WHERE p.id = v_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify transfer_to_joint to also insert a mirror movement in the joint account
-- This replaces the old version
CREATE OR REPLACE FUNCTION transfer_to_joint(from_user_id UUID, amount DECIMAL, description TEXT DEFAULT 'Transferencia a cuenta conjunta')
RETURNS BOOLEAN AS $$
DECLARE
  ja_id UUID;
  v_pid UUID;
  v_sender_name TEXT;
  v_ja_name TEXT;
BEGIN
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

  -- Note: The trigger handle_movement_joint_balance will update joint_accounts.balance
  -- for the is_couple=true movement, so we no longer need the direct UPDATE here.

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add theme column to joint_accounts
ALTER TABLE joint_accounts ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';

-- RPC to update joint account theme
CREATE OR REPLACE FUNCTION update_joint_account_theme(p_joint_account_id UUID, p_theme TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE joint_accounts SET theme = p_theme WHERE id = p_joint_account_id;
  RETURN TRUE;
END;
$$;

-- Add app_theme column to profiles for personal app theme
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_theme TEXT DEFAULT 'lavender';
