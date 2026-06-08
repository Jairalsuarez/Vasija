import { supabase } from '../lib/supabase';
import type { Tithe } from '../types';

const TITHE_RATE = 0.1;

export async function registerTithe(
  userId: string,
  incomeAmount: number,
  incomeMovementId: string,
  isPaid: boolean = false,
): Promise<Tithe | null> {
  const titheAmount = incomeAmount * TITHE_RATE;

  const { data } = await supabase
    .from('tithes')
    .insert({
      user_id: userId,
      amount: titheAmount,
      income_movement_id: incomeMovementId,
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .select()
    .single();

  return data as Tithe | null;
}

export async function payTithe(
  titheId: string,
  userId: string,
  amount: number,
  isCouple: boolean = false,
): Promise<boolean> {
  const { error } = await supabase
    .from('tithes')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', titheId);

  if (error) return false;

  await supabase.rpc('notify_user', {
    p_user_id: userId,
    p_title: 'Pago de diezmo',
    p_body: `Pagaste un diezmo de ${amount}.`,
    p_type: 'success',
    p_metadata: {
      scope: isCouple ? 'couple' : 'personal',
      type: 'tithe',
      amount,
      category: 'Diezmo',
      description: 'Diezmo',
      route: '/dashboard',
    },
  });

  return true;
}

export async function getPendingTithes(userId: string): Promise<Tithe[]> {
  const { data } = await supabase
    .from('tithes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_paid', false)
    .order('due_date', { ascending: true });

  return (data as Tithe[]) || [];
}

export async function addManualTithe(
  userId: string,
  amount: number,
): Promise<Tithe | null> {
  // Always insert as pending (not paid yet — user will click Completar to zero counter)
  const { data } = await supabase
    .from('tithes')
    .insert({
      user_id: userId,
      amount,
      is_paid: false,
      due_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (data) {
    // Immediately deduct from personal balance
    await supabase
      .from('movements')
      .insert({
        user_id: userId,
        type: 'tithe',
        amount,
        description: 'Diezmo',
        category: 'Iglesia - Diezmo',
        date: new Date().toISOString().split('T')[0],
        is_couple: false, // Always personal
      });
  }

  return data as Tithe | null;
}
