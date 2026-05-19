-- 1. Exclude couple movements from personal balance calculation
CREATE OR REPLACE FUNCTION get_user_balance(user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'income' THEN amount
      WHEN type IN ('expense', 'tithe', 'transfer_to_joint') THEN -amount
      ELSE 0
    END
  ), 0) INTO total
  FROM movements
  WHERE movements.user_id = get_user_balance.user_id
    AND is_couple = FALSE; -- Exclude couple movements!
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to automatically update joint account balance when a couple movement is added, updated, or deleted
CREATE OR REPLACE FUNCTION handle_movement_joint_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_cl_id UUID;
  v_ja_id UUID;
  v_pid UUID;
  v_change DECIMAL;
BEGIN
  -- Determine the balance change
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_couple = TRUE THEN
      v_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
      
      -- Find partner
      SELECT partner_id INTO v_pid FROM profiles WHERE id = NEW.user_id;
      
      -- Find couple link
      SELECT id INTO v_cl_id FROM couple_links WHERE user_id IN (NEW.user_id, v_pid) LIMIT 1;
      
      IF v_cl_id IS NOT NULL THEN
        -- Find or create joint account
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NULL THEN
          INSERT INTO joint_accounts (couple_id, balance) VALUES (v_cl_id, 0) RETURNING id INTO v_ja_id;
        END IF;
        
        -- Update balance
        UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_couple = TRUE THEN
      v_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
      
      -- Find partner
      SELECT partner_id INTO v_pid FROM profiles WHERE id = OLD.user_id;
      
      -- Find couple link
      SELECT id INTO v_cl_id FROM couple_links WHERE user_id IN (OLD.user_id, v_pid) LIMIT 1;
      
      IF v_cl_id IS NOT NULL THEN
        SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
        IF v_ja_id IS NOT NULL THEN
          UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
        END IF;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If is_couple was or became true, we handle the adjustment
    IF OLD.is_couple = TRUE OR NEW.is_couple = TRUE THEN
      -- To keep it perfectly clean and bulletproof, subtract old effect and add new effect
      
      -- 1. Reverse old effect
      IF OLD.is_couple = TRUE THEN
        v_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
        SELECT partner_id INTO v_pid FROM profiles WHERE id = OLD.user_id;
        SELECT id INTO v_cl_id FROM couple_links WHERE user_id IN (OLD.user_id, v_pid) LIMIT 1;
        IF v_cl_id IS NOT NULL THEN
          SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
          IF v_ja_id IS NOT NULL THEN
            UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
          END IF;
        END IF;
      END IF;
      
      -- 2. Apply new effect
      IF NEW.is_couple = TRUE THEN
        v_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
        SELECT partner_id INTO v_pid FROM profiles WHERE id = NEW.user_id;
        SELECT id INTO v_cl_id FROM couple_links WHERE user_id IN (NEW.user_id, v_pid) LIMIT 1;
        IF v_cl_id IS NOT NULL THEN
          SELECT id INTO v_ja_id FROM joint_accounts WHERE couple_id = v_cl_id;
          IF v_ja_id IS NULL THEN
            INSERT INTO joint_accounts (couple_id, balance) VALUES (v_cl_id, 0) RETURNING id INTO v_ja_id;
          END IF;
          UPDATE joint_accounts SET balance = balance + v_change WHERE id = v_ja_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger
DROP TRIGGER IF EXISTS trg_movement_joint_balance ON movements;
CREATE TRIGGER trg_movement_joint_balance
AFTER INSERT OR DELETE OR UPDATE ON movements
FOR EACH ROW EXECUTE FUNCTION handle_movement_joint_balance();
