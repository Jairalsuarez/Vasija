import { supabase } from '../lib/supabase';
import type { Debt } from '../types';

export async function getDebts(userId: string, isCouple = false): Promise<Debt[]> {
  const q = supabase
    .from('debts')
    .select('*')
    .eq('is_couple', isCouple)
    .order('created_at', { ascending: false });

  if (!isCouple) q.eq('user_id', userId);

  const { data } = await q;
  return (data as Debt[]) || [];
}

export async function createDebt(
  debt: Omit<Debt, 'id' | 'created_at' | 'paid_amount' | 'installments_paid'>,
): Promise<Debt | null> {
  const { data } = await supabase
    .from('debts')
    .insert({ ...debt, paid_amount: 0, installments_paid: 0 })
    .select()
    .single();
  return data as Debt | null;
}

export async function payInstallment(
  debtId: string,
  amount: number,
): Promise<boolean> {
  const { error } = await supabase.rpc('pay_debt_installment', {
    debt_id: debtId,
    amount,
  });
  return !error;
}
