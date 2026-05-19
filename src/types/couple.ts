export interface CoupleLink {
  id: string;
  user_id: string;
  partner_id: string;
  code: string;
  linked_at: string;
}

export interface JointAccount {
  id: string;
  couple_id: string;
  balance: number;
  updated_at: string;
}

export interface JointTransaction {
  id: string;
  joint_account_id: string;
  from_user_id: string;
  amount: number;
  description: string;
  created_at: string;
}
