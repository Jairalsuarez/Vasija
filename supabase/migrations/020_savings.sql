CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  is_couple BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_is_couple ON savings(is_couple);

ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own savings" ON savings;
CREATE POLICY "Users can read own savings"
  ON savings FOR SELECT USING (auth.uid() = user_id OR is_couple = TRUE);

DROP POLICY IF EXISTS "Users can insert own savings" ON savings;
CREATE POLICY "Users can insert own savings"
  ON savings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own savings" ON savings;
CREATE POLICY "Users can update own savings"
  ON savings FOR UPDATE USING (auth.uid() = user_id OR is_couple = TRUE)
  WITH CHECK (auth.uid() = user_id OR is_couple = TRUE);
