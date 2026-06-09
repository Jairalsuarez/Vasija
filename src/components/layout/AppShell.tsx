import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const { setBalance, setJointBalance, setJointAccountMeta, setMovements, setTitheBalance } = useFinanceStore();
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
      if (jointAccount) {
        setJointBalance(jointAccount.balance);
        setJointAccountMeta({
          id: jointAccount.id,
          name: jointAccount.account_name || 'Nuestra cuenta',
          theme: jointAccount.theme || 'purple',
        });
      }
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
  }, [profile?.id, profile?.partner_id, isLinked, isCoupleMode, setBalance, setJointBalance, setJointAccountMeta, setMovements, setTitheBalance]);

  return (
    <div className="min-h-screen bg-[var(--app-surface)] text-gray-950 dark:bg-[var(--theme-bg)] dark:text-[var(--theme-text-primary)] relative overflow-x-hidden">
      {/* Floating Ambient Background Orbs */}
      <div className="orb-layer">
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -100, 60, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="orb w-[300px] h-[300px] left-[10%] top-[20%]"
          style={{ backgroundColor: 'var(--theme-primary-light, rgba(99, 102, 241, 0.12))' }}
        />
        <motion.div
          animate={{
            x: [0, -90, 50, 0],
            y: [0, 80, -90, 0],
            scale: [1, 0.85, 1.15, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="orb w-[350px] h-[350px] right-[15%] bottom-[15%]"
          style={{ backgroundColor: 'var(--theme-secondary-light, rgba(236, 72, 153, 0.12))' }}
        />
        <motion.div
          animate={{
            x: [0, 60, -80, 0],
            y: [0, 110, -60, 0],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="orb w-[280px] h-[280px] left-[40%] bottom-[30%]"
          style={{ backgroundColor: 'var(--theme-primary-light, rgba(59, 130, 246, 0.1))' }}
        />
      </div>

      <div className="relative z-10">
        <Sidebar />
        <div className="md:ml-64">
          <TopBar />
          <main className="w-full max-w-5xl mx-auto px-4 py-5 pb-28 sm:px-5 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

