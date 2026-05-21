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
  account_name?: string | null;
  theme?: string;
  updated_at: string;
}

export interface NameChangeRequest {
  id: string;
  joint_account_id: string;
  requester_id: string;
  proposed_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
}

export interface JointTransaction {
  id: string;
  joint_account_id: string;
  from_user_id: string;
  amount: number;
  description: string;
  created_at: string;
}
