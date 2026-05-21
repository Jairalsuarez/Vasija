import { supabase } from '../lib/supabase';

export async function saveHomePaymentSchedule(params: {
  homeSlug: string;
  homeName: string;
  amount: number;
  dueDate: string;
  dueTime: string;
  isCouple: boolean;
  remind: boolean;
}): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('upsert_home_payment_schedule', {
    p_home_slug: params.homeSlug,
    p_home_name: params.homeName,
    p_amount: params.amount,
    p_due_date: params.dueDate,
    p_due_time: params.dueTime,
    p_is_couple: params.isCouple,
    p_remind: params.remind,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
