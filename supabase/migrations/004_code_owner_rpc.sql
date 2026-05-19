-- RPC to look up code owner info (bypasses RLS)
CREATE OR REPLACE FUNCTION get_code_owner(code_text TEXT)
RETURNS TABLE (user_id UUID, name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cl.user_id, p.name, p.avatar_url
  FROM couple_links cl
  JOIN profiles p ON p.id = cl.user_id
  WHERE cl.code = code_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get partner info by ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_partner_info(partner_id UUID)
RETURNS TABLE (name TEXT, avatar_url TEXT, couple_alias TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, p.avatar_url, p.couple_alias::TEXT
  FROM profiles p
  WHERE p.id = get_partner_info.partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to link two profiles (bypasses RLS for partner update)
CREATE OR REPLACE FUNCTION link_couple(user_id UUID, partner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET partner_id = link_couple.partner_id WHERE id = link_couple.user_id;
  UPDATE profiles SET partner_id = link_couple.user_id WHERE id = link_couple.partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
