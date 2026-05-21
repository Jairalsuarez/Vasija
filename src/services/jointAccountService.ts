import { supabase } from '../lib/supabase';
import type { JointAccount } from '../types';

export async function getJointAccount(
  userId: string,
): Promise<JointAccount | null> {
  const { data } = await supabase
    .rpc('get_or_create_joint_account', { v_user_id: userId })
    .single();
  if (!data) return null;
  const row = data as unknown as { id: string; balance: number; account_name: string; theme: string };

  return {
    id: row.id,
    couple_id: '',
    balance: row.balance,
    account_name: row.account_name || 'Nuestra cuenta',
    theme: row.theme || 'default',
    updated_at: '',
  };
}

export async function getJointAccountBalance(
  userId: string,
): Promise<number> {
  const acc = await getJointAccount(userId);
  return acc?.balance ?? 0;
}

export async function transferToJoint(
  userId: string,
  amount: number,
  description?: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('transfer_to_joint', {
    from_user_id: userId,
    amount,
    description: description || 'Transferencia a cuenta conjunta',
  });
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function updateJointAccountTheme(
  jointAccountId: string,
  theme: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('update_joint_account_theme', {
    p_joint_account_id: jointAccountId,
    p_theme: theme,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
