CREATE TABLE IF NOT EXISTS couple_love_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 240),
  suggestion_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_couple_love_notes_pair_created
ON couple_love_notes (user_id, partner_id, created_at DESC);

ALTER TABLE couple_love_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can read their notes" ON couple_love_notes;
CREATE POLICY "Couples can read their notes"
  ON couple_love_notes FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can send notes to partner" ON couple_love_notes;
CREATE POLICY "Users can send notes to partner"
  ON couple_love_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND partner_id = couple_love_notes.partner_id
    )
  );

DROP POLICY IF EXISTS "Recipients can mark notes read" ON couple_love_notes;
CREATE POLICY "Recipients can mark notes read"
  ON couple_love_notes FOR UPDATE
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_love_notes;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
