import { supabase } from '../lib/supabase';

export async function getJointAccountBalance(
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .rpc('get_or_create_joint_account', { user_id: userId })
    .single();
  return (data as unknown as { balance: number })?.balance ?? 0;
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
