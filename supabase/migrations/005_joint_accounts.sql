-- RPC to get partner info by ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_partner_info(partner_id UUID)
RETURNS TABLE (name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, p.avatar_url
  FROM profiles p
  WHERE p.id = partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get or create a joint account for a linked couple
CREATE OR REPLACE FUNCTION get_or_create_joint_account(v_user_id UUID)
RETURNS TABLE (id UUID, balance DECIMAL) AS $$
DECLARE
  v_pid UUID;
  v_cl_id UUID;
  v_ja_id UUID;
  v_ja_balance DECIMAL;
BEGIN
  SELECT partner_id INTO v_pid FROM profiles WHERE profiles.id = v_user_id;
  IF v_pid IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL;
    RETURN;
  END IF;

  SELECT cl.id INTO v_cl_id
  FROM couple_links cl
  WHERE cl.user_id IN (v_user_id, v_pid)
  LIMIT 1;

  IF v_cl_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::DECIMAL;
    RETURN;
  END IF;

  SELECT ja.id, ja.balance INTO v_ja_id, v_ja_balance
  FROM joint_accounts ja
  WHERE ja.couple_id = v_cl_id;

  IF v_ja_id IS NULL THEN
    INSERT INTO joint_accounts (couple_id, balance)
    VALUES (v_cl_id, 0)
    RETURNING joint_accounts.id, joint_accounts.balance INTO v_ja_id, v_ja_balance;
  END IF;

  RETURN QUERY SELECT v_ja_id, COALESCE(v_ja_balance, 0)::DECIMAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to transfer from personal to joint account
CREATE OR REPLACE FUNCTION transfer_to_joint(from_user_id UUID, amount DECIMAL, description TEXT DEFAULT 'Transferencia a cuenta conjunta')
RETURNS BOOLEAN AS $$
DECLARE
  ja_id UUID;
BEGIN
  SELECT g.id INTO ja_id
  FROM get_or_create_joint_account(from_user_id) AS g;

  IF ja_id IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO movements (user_id, type, amount, description, category, date, is_couple)
  VALUES (from_user_id, 'transfer_to_joint', amount, description, 'transferencia', CURRENT_DATE, false);

  UPDATE joint_accounts SET balance = balance + amount WHERE id = ja_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
