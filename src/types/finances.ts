export type MovementType = 'income' | 'expense' | 'tithe' | 'transfer_to_joint';
export type DebtType = 'finite' | 'infinite';
export type GoalCategory = 'savings' | 'vacation' | 'temple' | 'other';

export interface Movement {
  id: string;
  user_id: string;
  type: MovementType;
  amount: number;
  description: string;
  category: string;
  date: string;
  is_couple: boolean;
  is_paid?: boolean;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  total_amount: number;
  paid_amount: number;
  installments_total: number;
  installments_paid: number;
  interest_rate: number;
  is_couple: boolean;
  due_date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  deadline: string;
  is_couple: boolean;
  created_at: string;
}

export interface Saving {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  is_couple: boolean;
  created_at: string;
}

export interface Tithe {
  id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
  income_movement_id: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}
