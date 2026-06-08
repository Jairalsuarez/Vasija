import { supabase } from '../lib/supabase';
import type { Movement, Tithe } from '../types';
import { registerTithe } from './titheService';

export async function getMovements(
  userId: string,
  isCouple: boolean,
  partnerId?: string | null,
): Promise<Movement[]> {
  const query = supabase
    .from('movements')
    .select('*')
    .eq('is_couple', isCouple)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isCouple && partnerId) {
    query.in('user_id', [userId, partnerId]);
  } else {
    query.eq('user_id', userId);
  }

  const { data } = await query;
  return (data as Movement[]) || [];
}

export async function createMovement(
  movement: Omit<Movement, 'id' | 'created_at'>,
  autoTithe: boolean = false,
): Promise<{ movement: Movement | null; tithe: Tithe | null }> {
  const { data } = await supabase
    .from('movements')
    .insert(movement)
    .select()
    .single();
  const mov = data as Movement | null;
  let tithe: Tithe | null = null;
  if (mov && movement.type === 'income' && !movement.is_couple && autoTithe) {
    tithe = await registerTithe(movement.user_id, movement.amount, mov.id, false);
    await supabase
      .from('movements')
      .insert({
        user_id: movement.user_id,
        type: 'tithe',
        amount: movement.amount * 0.1,
        description: 'Diezmo',
        category: 'Iglesia',
        date: movement.date,
        is_couple: false,
      });
  }
  return { movement: mov, tithe };
}

export async function getBalance(
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .rpc('get_user_balance', { user_id: userId });
  return data ?? 0;
}

export async function completeFastOfferings(
  userId: string,
  isCouple: boolean,
): Promise<boolean> {
  let pendingQuery = supabase
    .from('movements')
    .select('amount')
    .eq('category', 'Ofrenda de Ayuno')
    .eq('is_paid', false);

  if (isCouple) {
    pendingQuery = pendingQuery.eq('is_couple', true);
  } else {
    pendingQuery = pendingQuery.eq('user_id', userId).eq('is_couple', false);
  }

  const { data: pendingOfferings } = await pendingQuery;
  const totalAmount = (pendingOfferings || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  let query = supabase
    .from('movements')
    .update({ is_paid: true })
    .eq('category', 'Ofrenda de Ayuno')
    .eq('is_paid', false);

  if (isCouple) {
    query = query.eq('is_couple', true);
  } else {
    query = query.eq('user_id', userId).eq('is_couple', false);
  }

  const { error } = await query;
  if (error) return false;

  if (totalAmount > 0) {
    await supabase.rpc('notify_user', {
      p_user_id: userId,
      p_title: 'Pago de ofrenda',
      p_body: `Pagaste ofrendas por ${totalAmount}.`,
      p_type: 'success',
      p_metadata: {
        scope: isCouple ? 'couple' : 'personal',
        type: 'offering',
        amount: totalAmount,
        category: 'Ofrenda de Ayuno',
        description: 'Ofrenda de Ayuno',
        route: '/dashboard',
      },
    });
  }

  return true;
}
