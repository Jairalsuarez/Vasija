import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFinanceStore } from '../store';
import type { Movement } from '../types';

export function useRealtimeMovements(userId: string) {
  const { addMovement } = useFinanceStore();

  useEffect(() => {
    const channel = supabase
      .channel('movements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'movements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addMovement(payload.new as Movement);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addMovement]);
}
