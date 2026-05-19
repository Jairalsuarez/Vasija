-- Add is_paid column to movements
ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Add update policy for movements so users can mark them as paid/completed
DROP POLICY IF EXISTS "Users can update own movements" ON movements;
CREATE POLICY "Users can update own movements"
  ON movements FOR UPDATE USING (auth.uid() = user_id);

-- Add insert policy for tithes table so users can register manual tithes
DROP POLICY IF EXISTS "Users can insert own tithes" ON tithes;
CREATE POLICY "Users can insert own tithes"
  ON tithes FOR INSERT WITH CHECK (auth.uid() = user_id);
