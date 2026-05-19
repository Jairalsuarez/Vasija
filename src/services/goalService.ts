import { supabase } from '../lib/supabase';
import type { Goal } from '../types';

export async function getGoals(userId: string, isCouple = false): Promise<Goal[]> {
  const q = supabase
    .from('goals')
    .select('*')
    .eq('is_couple', isCouple)
    .order('created_at', { ascending: false });

  if (!isCouple) q.eq('user_id', userId);

  const { data } = await q;
  return (data as Goal[]) || [];
}

export async function createGoal(
  goal: Omit<Goal, 'id' | 'created_at' | 'current_amount'>,
): Promise<Goal | null> {
  const { data } = await supabase
    .from('goals')
    .insert({ ...goal, current_amount: 0 })
    .select()
    .single();
  return data as Goal | null;
}

export async function contributeToGoal(
  goalId: string,
  amount: number,
): Promise<boolean> {
  const { error } = await supabase.rpc('contribute_to_goal', {
    goal_id: goalId,
    amount,
  });
  return !error;
}
