ALTER TABLE couple_links ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE couple_links ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'expired'));
ALTER TABLE couple_links ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

UPDATE couple_links
SET status = 'pending'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_couple_links_user_status_created
  ON couple_links(user_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION create_couple_code(v_user_id UUID)
RETURNS TABLE (code TEXT) AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_partner UUID;
  v_attempts INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'No puedes generar código para otro usuario';
  END IF;

  SELECT partner_id INTO v_partner FROM profiles WHERE id = v_user_id;
  IF v_partner IS NOT NULL THEN
    RAISE EXCEPTION 'Ya estás conectado con una pareja';
  END IF;

  UPDATE couple_links
  SET status = 'expired'
  WHERE user_id = v_user_id AND status = 'pending';

  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    SELECT EXISTS(SELECT 1 FROM couple_links cl WHERE cl.code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      EXIT;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'No se pudo generar un código único';
    END IF;
  END LOOP;

  INSERT INTO couple_links(user_id, code, status)
  VALUES (v_user_id, v_code, 'pending');

  RETURN QUERY SELECT v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_code_owner(code_text TEXT)
RETURNS TABLE (user_id UUID, name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cl.user_id, p.name, p.avatar_url
  FROM couple_links cl
  JOIN profiles p ON p.id = cl.user_id
  WHERE cl.code = upper(code_text)
    AND cl.status = 'pending'
    AND p.partner_id IS NULL
  ORDER BY cl.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION link_couple(user_id UUID, partner_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_partner UUID;
  v_partner_partner UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_couple_link_id(v_user_id UUID, v_partner_id UUID)
RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
BEGIN
  SELECT cl.id INTO v_link_id
  FROM couple_links cl
  WHERE cl.user_id IN (v_user_id, v_partner_id)
    AND (cl.partner_id IN (v_user_id, v_partner_id) OR cl.partner_id IS NULL)
  ORDER BY
    CASE WHEN cl.status = 'linked' THEN 0 ELSE 1 END,
    cl.linked_at DESC NULLS LAST,
    cl.created_at DESC
  LIMIT 1;

  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_movement_joint_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_cl_id UUID;
  v_ja_id UUID;
  v_pid UUID;
  v_change DECIMAL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_couple = TRUE THEN
      v_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
      SELECT partner_id INTO v_pid FROM profiles WHERE id = NEW.user_id;
      SELECT current_couple_link_id(NEW.user_id, v_pid) INTO v_cl_id;
      IF v_cl_id IS NOT NULL THEN
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NULL THEN
          INSERT INTO joint_accounts (couple_id, balance) VALUES (v_cl_id, 0) RETURNING id INTO v_ja_id;
        END IF;
        UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_couple = TRUE THEN
      v_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
      SELECT partner_id INTO v_pid FROM profiles WHERE id = OLD.user_id;
      SELECT current_couple_link_id(OLD.user_id, v_pid) INTO v_cl_id;
      IF v_cl_id IS NOT NULL THEN
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NOT NULL THEN
          UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
        END IF;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_couple = TRUE THEN
      v_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
      SELECT partner_id INTO v_pid FROM profiles WHERE id = OLD.user_id;
      SELECT current_couple_link_id(OLD.user_id, v_pid) INTO v_cl_id;
      IF v_cl_id IS NOT NULL THEN
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NOT NULL THEN
          UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
        END IF;
      END IF;
    END IF;

    IF NEW.is_couple = TRUE THEN
      v_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
      SELECT partner_id INTO v_pid FROM profiles WHERE id = NEW.user_id;
      SELECT current_couple_link_id(NEW.user_id, v_pid) INTO v_cl_id;
      IF v_cl_id IS NOT NULL THEN
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NULL THEN
          INSERT INTO joint_accounts (couple_id, balance) VALUES (v_cl_id, 0) RETURNING id INTO v_ja_id;
        END IF;
        UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
