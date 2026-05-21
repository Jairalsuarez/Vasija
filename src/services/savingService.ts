import { supabase } from '../lib/supabase';
import type { Saving } from '../types';

export async function getSavings(userId: string, isCouple = false): Promise<Saving[]> {
  const q = supabase
    .from('savings')
    .select('*')
    .eq('is_couple', isCouple)
    .order('created_at', { ascending: false });

  if (!isCouple) q.eq('user_id', userId);

  const { data } = await q;
  return (data as Saving[]) || [];
}

export async function createSaving(
  saving: Omit<Saving, 'id' | 'created_at' | 'current_amount'> & { current_amount?: number },
): Promise<Saving | null> {
  const { data } = await supabase
    .from('savings')
    .insert({ ...saving, current_amount: saving.current_amount || 0 })
    .select()
    .single();

  return data as Saving | null;
}
