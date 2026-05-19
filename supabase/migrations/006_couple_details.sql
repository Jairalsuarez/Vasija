-- Create couples table for shared relationship details
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  together_since DATE,
  anniversary_date DATE,
  is_married BOOLEAN DEFAULT FALSE,
  is_sealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_couple UNIQUE (user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own couple details"
  ON couples FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert own couple details"
  ON couples FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own couple details"
  ON couples FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
