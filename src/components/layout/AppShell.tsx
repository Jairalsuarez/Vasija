import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useCoupleStore, useFinanceStore, useProfileStore } from '../../store';
import { getBalance, getMovements } from '../../services/movementService';
import { getJointAccount } from '../../services/jointAccountService';
import { getPendingTithes } from '../../services/titheService';
import { supabase } from '../../lib/supabase';

export function AppShell() {
  const { profile } = useProfileStore();
  const { isLinked, viewMode } = useCoupleStore();
  const { setBalance, setJointBalance, setMovements, setTitheBalance } = useFinanceStore();
  const isCoupleMode = viewMode === 'couple';

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const warmFinanceData = async () => {
      const [balance, movements, jointAccount, pendingTithes] = await Promise.all([
        getBalance(profile.id),
        getMovements(profile.id, isCoupleMode, profile.partner_id),
        isLinked ? getJointAccount(profile.id) : Promise.resolve(null),
        getPendingTithes(profile.id),
      ]);

      if (cancelled) return;
      setBalance(balance);
      setMovements(movements);
      if (jointAccount) setJointBalance(jointAccount.balance);
      setTitheBalance(pendingTithes.reduce((sum, tithe) => sum + tithe.amount, 0));
    };

    void warmFinanceData();

    const channel = supabase
      .channel(`finance-live-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movements', filter: `user_id=eq.${profile.id}` },
        () => void warmFinanceData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tithes', filter: `user_id=eq.${profile.id}` },
        () => void warmFinanceData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'joint_accounts' },
        () => void warmFinanceData(),
      );

    if (profile.partner_id) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movements', filter: `user_id=eq.${profile.partner_id}` },
        () => void warmFinanceData(),
      );
    }

    channel.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.partner_id, isLinked, isCoupleMode, setBalance, setJointBalance, setMovements, setTitheBalance]);

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[var(--theme-bg)] dark:text-[var(--theme-text-primary)]">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="w-full max-w-7xl mx-auto px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
