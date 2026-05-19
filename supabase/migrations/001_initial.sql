-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'unspecified')),
  phone TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+593',
  avatar_url TEXT,
  couple_code TEXT,
  partner_id UUID REFERENCES profiles(id),
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Couple links
CREATE TABLE couple_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Joint account
CREATE TABLE joint_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Joint transactions
CREATE TABLE joint_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_account_id UUID NOT NULL REFERENCES joint_accounts(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movements
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'tithe', 'transfer_to_joint')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  is_couple BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_user_id ON movements(user_id);
CREATE INDEX idx_movements_date ON movements(date DESC);

-- Debts
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('finite', 'infinite')),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  installments_total INTEGER,
  installments_paid INTEGER DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  is_couple BOOLEAN DEFAULT FALSE,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('savings', 'vacation', 'temple', 'other')),
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0,
  deadline DATE NOT NULL,
  is_couple BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tithes
CREATE TABLE tithes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  is_paid BOOLEAN DEFAULT FALSE,
  income_movement_id UUID REFERENCES movements(id),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: Get user balance
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
  WHERE movements.user_id = get_user_balance.user_id;
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Pay debt installment
CREATE OR REPLACE FUNCTION pay_debt_installment(debt_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE debts
  SET
    paid_amount = paid_amount + amount,
    installments_paid = installments_paid + 1
  WHERE id = debt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Contribute to goal
CREATE OR REPLACE FUNCTION contribute_to_goal(goal_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE goals
  SET current_amount = current_amount + amount
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own movements"
  ON movements FOR SELECT USING (auth.uid() = user_id OR is_couple = TRUE);

CREATE POLICY "Users can insert own movements"
  ON movements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own debts"
  ON debts FOR SELECT USING (auth.uid() = user_id OR is_couple = TRUE);

CREATE POLICY "Users can insert own debts"
  ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT USING (auth.uid() = user_id OR is_couple = TRUE);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own tithes"
  ON tithes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tithes"
  ON tithes FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
