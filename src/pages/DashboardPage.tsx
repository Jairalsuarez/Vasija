import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine, Repeat2, User, Users, HeartHandshake, Percent, Cross, Gift } from 'lucide-react';
import { useProfileStore, useFinanceStore, useCoupleStore, useUIStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { getBalance, getMovements, createMovement, completeFastOfferings } from '../services/movementService';
import { getJointAccount } from '../services/jointAccountService';
import { useAppTheme } from '../hooks/useAppTheme';
import { getThemeColor } from '../config/themes';
import { getPendingTithes, payTithe as payTitheService, addManualTithe } from '../services/titheService';
import { getSavings } from '../services/savingService';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { Movement, Saving, Tithe } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';


function MovementIcon({ type, className = 'w-5 h-5' }: { type: string; className?: string }) {
  if (type === 'income') return <ArrowDownToLine className={className} />;
  if (type === 'transfer_to_joint') return <Repeat2 className={className} />;
  return <ArrowUpFromLine className={className} />;
}

export function DashboardPage() {
  const { profile } = useProfileStore();
  const { isLinked, partnerAlias, viewMode, setLinked, setPartner, resetCouple } = useCoupleStore();
  const {
    balance,
    jointBalance: cachedJointBalance,
    jointAccountName: cachedJointAccountName,
    jointAccountTheme: cachedJointAccountTheme,
    setBalance,
    setJointBalance: setCachedJointBalance,
    setJointAccountMeta,
    setMovements,
    movements,
    setTitheBalance,
    titheBalance,
  } = useFinanceStore();
  const { autoTithe } = useUIStore();
  const navigate = useNavigate();
  const appTheme = useAppTheme();

  const [jointBalance, setJointBalance] = useState(cachedJointBalance);
  const [jointAccountName, setJointAccountName] = useState(cachedJointAccountName);
  const [jointTheme, setJointTheme] = useState(cachedJointAccountTheme);

  const [quickOpen, setQuickOpen] = useState<'income' | 'expense' | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const [detailMovement, setDetailMovement] = useState<Movement | null>(null);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    warningText?: string;
    onConfirm: () => void;
    type?: 'warning' | 'info';
  } | null>(null);

  const [pendingTithes, setPendingTithes] = useState<Tithe[]>([]);
  const [tithingLoading, setTithingLoading] = useState(false);
  const [titheModalOpen, setTitheModalOpen] = useState(false);
  const [manualTitheAmount, setManualTitheAmount] = useState('');
  const [manualTitheLoading, setManualTitheLoading] = useState(false);
  const [completingOfferings, setCompletingOfferings] = useState(false);

  const [fastOfferingModalOpen, setFastOfferingModalOpen] = useState(false);
  const [fastOfferingAmount, setFastOfferingAmount] = useState('');
  const [fastOfferingDesc, setFastOfferingDesc] = useState('Aporte de ayuno');
  const [fastOfferingLoading, setFastOfferingLoading] = useState(false);

  const isCoupleMode = viewMode === 'couple';
  const previousBalanceRef = useRef<number | null>(null);
  const previousAccountKeyRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const soundTimerRef = useRef<number | null>(null);
  const loadRequestRef = useRef(0);
  const skipNextBalanceAnimationRef = useRef(false);
  const latestVisibleBalanceRef = useRef<number | null>(null);
  const latestActiveBalanceRef = useRef(0);
  const latestActiveAccountKeyRef = useRef<'personal' | 'joint'>('personal');
  const balancesReadyRef = useRef(false);
  const [balancesReady, setBalancesReady] = useState(false);
  const [displayedBalance, setDisplayedBalance] = useState<number | null>(null);
  const [quickActionPressed, setQuickActionPressed] = useState<'income' | 'transfer' | 'expense' | null>(null);
  const [activityTab, setActivityTab] = useState<'movements' | 'savings'>('movements');
  const [savingPlans, setSavingPlans] = useState<Saving[]>([]);

  const profileId = profile?.id;
  const profilePartnerId = profile?.partner_id;
  const profilePartnerAlias = profile?.partner_alias;
  const hasFinanceSnapshot = movements.length > 0 || balance !== 0 || cachedJointBalance !== 0 || titheBalance !== 0;

  const sparklineData = useMemo(() => {
    if (movements.length === 0) return [];
    const sorted = [...movements]
      .filter((m) => isCoupleMode ? m.is_couple : !m.is_couple)
      .sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const points: { balance: number }[] = [];
    sorted.forEach((m) => {
      const change = m.type === 'income' ? m.amount : -m.amount;
      running += change;
      points.push({ balance: running });
    });
    return points.slice(-12);
  }, [movements, isCoupleMode]);

  const fastOfferingBalance = movements
    .filter((m) => m.category === 'Ofrenda de Ayuno' && !m.is_paid)
    .reduce((sum, m) => sum + m.amount, 0);

  const displayTithe = titheBalance;
  const activeAccountBalance = isCoupleMode && isLinked ? jointBalance : balance;
  const activeAccountKey = isCoupleMode && isLinked ? 'joint' : 'personal';
  const visibleBalance = displayedBalance ?? activeAccountBalance;

  useEffect(() => {
    latestVisibleBalanceRef.current = displayedBalance;
    latestActiveBalanceRef.current = activeAccountBalance;
    latestActiveAccountKeyRef.current = activeAccountKey;
    balancesReadyRef.current = balancesReady;
  }, [activeAccountBalance, activeAccountKey, balancesReady, displayedBalance]);

  const goToMoneyPage = (path: '/income' | '/expense') => {
    sessionStorage.setItem('vasija:balance-start', String(activeAccountBalance));
    navigate(path);
  };

  const playQuickAction = (action: 'income' | 'transfer' | 'expense', callback: () => void) => {
    setQuickActionPressed(action);
    window.setTimeout(() => {
      callback();
      setQuickActionPressed(null);
    }, 180);
  };

  const playBalanceSound = (kind: 'income' | 'expense') => {
    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const now = ctx.currentTime;
      const duration = 0.85;
      const steps = 10;
      const startTone = kind === 'income' ? 520 : 420;
      const endTone = kind === 'income' ? 1480 : 180;
      for (let index = 0; index < steps; index += 1) {
        const progress = index / Math.max(1, steps - 1);
        const offset = progress * duration;
        const tone = startTone + (endTone - startTone) * progress;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = kind === 'income' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(tone, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(kind === 'income' ? 0.035 : 0.022, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      }
      if (soundTimerRef.current) window.clearTimeout(soundTimerRef.current);
      soundTimerRef.current = window.setTimeout(() => void ctx.close(), 1200);
    } catch {
      // Audio can be blocked without recent user gesture.
    }
  };

  const animateDisplayedBalance = useCallback((start: number, end: number, kind?: 'income' | 'expense') => {
    if (kind) playBalanceSound(kind);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const startedAt = performance.now();
    const duration = 850;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedBalance(start + (end - start) * eased);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayedBalance(end);
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!balancesReady) return;

    if (skipNextBalanceAnimationRef.current) {
      skipNextBalanceAnimationRef.current = false;
      return;
    }

    if (previousAccountKeyRef.current !== null && previousAccountKeyRef.current !== activeAccountKey) {
      previousAccountKeyRef.current = activeAccountKey;
      previousBalanceRef.current = activeAccountBalance;
      setDisplayedBalance(activeAccountBalance);
      return;
    }
    previousAccountKeyRef.current = activeAccountKey;

    if (previousBalanceRef.current === null) {
      previousBalanceRef.current = activeAccountBalance;
      const pendingSound = sessionStorage.getItem('vasija:balance-sound') as 'income' | 'expense' | null;
      const pendingStart = Number(sessionStorage.getItem('vasija:balance-start'));
      const pendingDelta = Number(sessionStorage.getItem('vasija:balance-delta'));
      sessionStorage.removeItem('vasija:balance-sound');
      sessionStorage.removeItem('vasija:balance-start');
      sessionStorage.removeItem('vasija:balance-delta');

      if (pendingSound === 'income' || pendingSound === 'expense') {
        const fallbackStart = Number.isFinite(pendingDelta)
          ? activeAccountBalance + (pendingSound === 'income' ? -pendingDelta : pendingDelta)
          : activeAccountBalance;
        const start = Number.isFinite(pendingStart) ? pendingStart : fallbackStart;
        animateDisplayedBalance(start, activeAccountBalance, pendingSound);
      } else {
        setDisplayedBalance(activeAccountBalance);
      }
      return;
    }
    if (activeAccountBalance === previousBalanceRef.current) {
      if (displayedBalance === null) setDisplayedBalance(activeAccountBalance);
      return;
    }
    const start = previousBalanceRef.current;
    const end = activeAccountBalance;
    const kind = end > start ? 'income' : 'expense';
    previousBalanceRef.current = activeAccountBalance;
    animateDisplayedBalance(start, end, kind);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeAccountBalance, activeAccountKey, animateDisplayedBalance, balancesReady, displayedBalance]);

  const loadData = useCallback(async (options?: { animateRealtime?: boolean }) => {
    if (!profileId) return;
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    if (!hasFinanceSnapshot) setBalancesReady(false);
    const realtimeStart = options?.animateRealtime
      ? latestVisibleBalanceRef.current ?? latestActiveBalanceRef.current
      : null;
    const realtimeAccountKey = latestActiveAccountKeyRef.current;

    const [bal, movs, jointAcc, pending, savings, latestProfile] = await Promise.all([
      getBalance(profileId),
      getMovements(profileId, isCoupleMode, profilePartnerId),
      isLinked ? getJointAccount(profileId) : Promise.resolve(null),
      getPendingTithes(profileId),
      getSavings(profileId, isCoupleMode),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    if (requestId !== loadRequestRef.current) return;

    const nextAccountKey = isCoupleMode && isLinked ? 'joint' : 'personal';
    const nextActiveBalance = nextAccountKey === 'joint'
      ? jointAcc?.balance ?? latestActiveBalanceRef.current
      : bal;
    const shouldAnimateRealtime =
      !!options?.animateRealtime &&
      balancesReadyRef.current &&
      realtimeAccountKey === nextAccountKey &&
      realtimeStart !== null &&
      nextActiveBalance !== realtimeStart;

    setBalance(bal);
    setMovements(movs);

    if (jointAcc) {
      setJointBalance(jointAcc.balance);
      setCachedJointBalance(jointAcc.balance);
      const nextJointName = jointAcc.account_name || 'Nuestra cuenta';
      const nextJointTheme = jointAcc.theme || 'purple';
      setJointAccountName(nextJointName);
      setJointTheme(nextJointTheme);
      setJointAccountMeta({ id: jointAcc.id, name: nextJointName, theme: nextJointTheme });
    }

    setPendingTithes(pending);
    setSavingPlans(savings);
    const totalTithe = pending.reduce((sum, t) => sum + t.amount, 0);
    setTitheBalance(totalTithe);

    // Dynamic sync of couple connection status and partner profile
    if (latestProfile) {
      if (latestProfile.partner_id) {
        console.log("[DEBUG DASH] Loading partner info for ID:", latestProfile.partner_id);
        const { data: rawPartner, error: rpcErr } = await supabase
          .rpc('get_partner_info', { v_partner_id: latestProfile.partner_id })
          .maybeSingle();
        if (rpcErr) {
          console.error("[DEBUG DASH] Error in get_partner_info RPC:", rpcErr);
        } else {
          console.log("[DEBUG DASH] Partner data loaded successfully:", rawPartner);
        }
        const partnerData = rawPartner as { name: string; avatar_url: string | null } | null;
        if (requestId !== loadRequestRef.current) return;
        setLinked(true);
        setPartner(partnerData?.name || 'Pareja', partnerData?.avatar_url || null, profilePartnerAlias || null);
      } else {
        resetCouple();
      }
    }
    setBalancesReady(true);

    if (shouldAnimateRealtime) {
      const kind = nextActiveBalance > realtimeStart ? 'income' : 'expense';
      skipNextBalanceAnimationRef.current = true;
      previousAccountKeyRef.current = nextAccountKey;
      previousBalanceRef.current = nextActiveBalance;
      setDisplayedBalance(realtimeStart);
      requestAnimationFrame(() => {
        animateDisplayedBalance(realtimeStart, nextActiveBalance, kind);
      });
    }
  }, [profileId, profilePartnerId, profilePartnerAlias, setBalance, setCachedJointBalance, setJointAccountMeta, setMovements, isLinked, isCoupleMode, setTitheBalance, setLinked, setPartner, resetCouple, hasFinanceSnapshot, animateDisplayedBalance]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription for sync across partners
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: profile.partner_id ? `id=eq.${profile.partner_id}` : undefined,
        },
        async (payload) => {
          const updatedPartner = payload.new as { name: string; avatar_url: string | null };
          setPartner(
            updatedPartner.name || 'Pareja',
            updatedPartner.avatar_url || null,
            profile?.partner_alias || null
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movements',
        },
        () => {
          loadData({ animateRealtime: true });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'joint_accounts',
        },
        () => {
          loadData({ animateRealtime: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, profile?.partner_id, loadData, setPartner]);

  const recentMovements = movements.slice(0, 5);
  const recentSavings = savingPlans.slice(0, 5);

  const formatMovementActor = (m: Movement) => {
    if (!profile) return m.description;
    const isOwn = m.user_id === profile.id;
    if (isOwn) {
      if (m.type === 'transfer_to_joint') return 'Transferiste';
      if (m.type === 'income' && m.description.startsWith('Transferencia de')) return 'Transferiste';
      if (m.type === 'income') return 'Ingresaste dinero';
      if (m.type === 'expense') return 'Hiciste un gasto';
      return m.description;
    }
    if (!partnerAlias) return m.description;
    if (m.type === 'transfer_to_joint') return `${partnerAlias} ha transferido`;
    if (m.type === 'income' && m.description.startsWith('Transferencia de')) return `${partnerAlias} ha transferido`;
    if (m.type === 'income') return `${partnerAlias} ingresÃ³ dinero`;
    if (m.type === 'expense') return `${partnerAlias} realizÃ³ un gasto`;
    return `${partnerAlias}: ${m.description}`;
  };

  const handleQuickSubmit = async (bypassConfirm = false) => {
    if (!profile || !quickAmount || !quickOpen) return;
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (isCoupleMode && !bypassConfirm) {
      if (quickOpen === 'income') {
        setConfirmModalConfig({
          title: "Confirmar Ingreso Compartido",
          message: "Â¿EstÃ¡s seguro de registrar este ingreso directamente en la cuenta compartida?",
          warningText: "ðŸ’¡ Consejo financiero: La forma recomendada es registrar el ingreso en tu cuenta personal y luego realizar una transferencia a \"Nuestro dinero\" para mantener un historial de movimientos ordenado.",
          type: 'warning',
          onConfirm: () => handleQuickSubmit(true),
        });
        return;
      } else {
        setConfirmModalConfig({
          title: "Confirmar Gasto Compartido",
          message: "Â¿EstÃ¡s seguro de registrar este gasto en la cuenta de la pareja?",
          type: 'info',
          onConfirm: () => handleQuickSubmit(true),
        });
        return;
      }
    }

    setQuickLoading(true);
    const { movement } = await createMovement({
      user_id: profile.id,
      type: quickOpen,
      amount,
      description: quickDesc.trim() || (quickOpen === 'income' ? 'Ingreso' : 'Gasto'),
      category: quickOpen === 'income' ? 'Ingreso' : 'Gasto',
      date: new Date().toISOString().split('T')[0],
      is_couple: isCoupleMode,
    }, autoTithe);
    if (movement) {
      setQuickOpen(null);
      setQuickAmount('');
      setQuickDesc('');
      loadData();
    }
    setQuickLoading(false);
  };

  const handlePayAllTithes = async () => {
    if (!profile || pendingTithes.length === 0) return;
    setTithingLoading(true);
    for (const tithe of pendingTithes) {
      await payTitheService(tithe.id, profile.id, tithe.amount, isCoupleMode);
    }
    loadData();
    setTithingLoading(false);
  };

  const handleFastOfferingSubmit = async () => {
    if (!profile || !fastOfferingAmount) return;
    const amount = parseFloat(fastOfferingAmount);
    if (isNaN(amount) || amount <= 0) return;
    setFastOfferingLoading(true);
    await createMovement({
      user_id: profile.id,
      type: 'expense',
      amount,
      description: fastOfferingDesc || 'Ofrenda de ayuno',
      category: 'Ofrenda de Ayuno',
      date: new Date().toISOString().split('T')[0],
      is_couple: isCoupleMode,
    });
    setFastOfferingModalOpen(false);
    setFastOfferingAmount('');
    setFastOfferingDesc('Aporte de ayuno');
    setFastOfferingLoading(false);
    loadData();
  };

  const handleManualTitheSubmit = async () => {
    if (!profile || !manualTitheAmount) return;
    const amount = parseFloat(manualTitheAmount);
    if (isNaN(amount) || amount <= 0) return;
    setManualTitheLoading(true);
    await addManualTithe(profile.id, amount);
    setManualTitheAmount('');
    setTitheModalOpen(false);
    loadData();
    setManualTitheLoading(false);
  };

  const handleCompleteFastOfferings = async () => {
    if (!profile) return;
    setCompletingOfferings(true);
    await completeFastOfferings(profile.id, isCoupleMode);
    setFastOfferingModalOpen(false);
    loadData();
    setCompletingOfferings(false);
  };

  const quickActionMotion = {
    initial: { scale: 1, opacity: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
    whileTap: { scale: 0.96, opacity: 0.98, boxShadow: '0 4px 12px rgba(0,0,0,0.14)' },
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Quick actions */}
      <div className={`grid gap-3 ${isLinked ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <motion.button
          {...quickActionMotion}
          animate={quickActionPressed === 'income'
            ? { scale: [1, 0.96, 1], opacity: [1, 0.98, 1], boxShadow: ['0 8px 20px rgba(0,0,0,0.12)', '0 4px 12px rgba(0,0,0,0.14)', '0 8px 20px rgba(0,0,0,0.12)'] }
            : { scale: 1, opacity: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
          onClick={() => playQuickAction('income', () => goToMoneyPage('/income'))}
          className={`quick-action-button quick-action-button--income min-h-[118px] rounded-2xl border border-gray-200 bg-white px-2.5 py-4 dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center justify-center gap-3 transition-colors hover:border-[var(--quick-color)] ${quickActionPressed === 'income' ? 'quick-action-button--pressed' : ''}`}
          aria-label="Ingresar dinero"
        >
          <div className="quick-action-button__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <ArrowDownToLine className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Ingresar</p>
        </motion.button>
        {isLinked && (
          <motion.button
            {...quickActionMotion}
            animate={quickActionPressed === 'transfer'
              ? { scale: [1, 0.96, 1], opacity: [1, 0.98, 1], boxShadow: ['0 8px 20px rgba(0,0,0,0.12)', '0 4px 12px rgba(0,0,0,0.14)', '0 8px 20px rgba(0,0,0,0.12)'] }
              : { scale: 1, opacity: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
            onClick={() => playQuickAction('transfer', () => navigate('/transfer'))}
            className={`quick-action-button quick-action-button--transfer min-h-[118px] rounded-2xl border border-gray-200 bg-white px-2.5 py-4 dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center justify-center gap-3 transition-colors hover:border-[var(--quick-color)] ${quickActionPressed === 'transfer' ? 'quick-action-button--pressed' : ''}`}
            aria-label="Transferir dinero"
          >
            <div className="quick-action-button__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
              <Repeat2 className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Transferir</p>
          </motion.button>
        )}
        <motion.button
          {...quickActionMotion}
          animate={quickActionPressed === 'expense'
            ? { scale: [1, 0.96, 1], opacity: [1, 0.98, 1], boxShadow: ['0 8px 20px rgba(0,0,0,0.12)', '0 4px 12px rgba(0,0,0,0.14)', '0 8px 20px rgba(0,0,0,0.12)'] }
            : { scale: 1, opacity: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
          onClick={() => playQuickAction('expense', () => goToMoneyPage('/expense'))}
          className={`quick-action-button quick-action-button--expense min-h-[118px] rounded-2xl border border-gray-200 bg-white px-2.5 py-4 dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center justify-center gap-3 transition-colors hover:border-[var(--quick-color)] ${quickActionPressed === 'expense' ? 'quick-action-button--pressed' : ''}`}
          aria-label="Gastar dinero"
        >
          <div className="quick-action-button__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
            <ArrowUpFromLine className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Gastar</p>
        </motion.button>
      </div>

      {/* Unified account card */}
      {(() => {
        const isJoint = isCoupleMode && isLinked;
        const jointThemeColor = getThemeColor(jointTheme);
        const accName = isJoint ? jointAccountName : (profile?.account_name || 'Mi cuenta');
        return (
          <motion.div
            onClick={() => navigate(isJoint ? '/accounts?type=joint' : '/accounts?type=personal')}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer shadow-lg shadow-black/5 dark:shadow-black/30"
            style={{ background: isJoint ? jointThemeColor.color : `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})` }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: isJoint ? jointThemeColor.accentColor : 'rgba(255, 255, 255, 0.15)' }}
            />
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: isJoint ? jointThemeColor.accentColor : 'rgba(255, 255, 255, 0.1)' }}
            />
            
            {/* Balance Card Sparkline */}
            {sparklineData.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 h-14 opacity-25 z-0 overflow-hidden pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="balance" stroke="#ffffff" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSparkline)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 mb-2">
                {isJoint ? <Users className="w-5 h-5 opacity-80" /> : <User className="w-5 h-5 opacity-80" />}
                <p className="opacity-80 text-sm font-medium">{accName}</p>
              </div>
            </div>
            {balancesReady || hasFinanceSnapshot ? (
              <h1 className="text-3xl font-bold mt-1 relative z-10">
                {formatCurrency(visibleBalance)}
              </h1>
            ) : (
              <div className="relative z-10 mt-3 h-9 w-44 overflow-hidden rounded-xl bg-white/20">
                <div className="h-full w-16 animate-pulse bg-white/25" />
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Tithe & Offerings inline under account card */}
      {!isCoupleMode && (
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/tithes')}
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary-light)]">
              <Cross className="h-4 w-4 text-[var(--theme-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Diezmo</p>
              <p className={`text-sm font-bold truncate ${displayTithe > 0 ? 'text-[var(--theme-primary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(displayTithe) : '...'}
              </p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/tithes')}
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-secondary-light)]">
              <Gift className="h-4 w-4 text-[var(--theme-secondary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Ofrendas</p>
              <p className={`text-sm font-bold truncate ${fastOfferingBalance > 0 ? 'text-[var(--theme-secondary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(fastOfferingBalance) : '...'}
              </p>
            </div>
          </motion.button>
        </div>
      )}

      {/* Activity - full width */}
      {(recentMovements.length > 0 || recentSavings.length > 0) && (
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Actividad reciente</h3>
            <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-white/10">
              {[
                ['movements', 'Movimientos'],
                ['savings', 'Ahorros'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActivityTab(value as 'movements' | 'savings')}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${
                    activityTab === value ? 'bg-white text-gray-950 shadow-sm dark:bg-[var(--theme-card-bg)] dark:text-white' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activityTab === 'movements' ? (
            <div className="space-y-1">
              {recentMovements.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDetailMovement(m)}
                  className="-mx-3 flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      m.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                      m.type === 'transfer_to_joint' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                      'bg-red-100 text-red-600 dark:bg-red-900/30'
                    }`}>
                      <MovementIcon type={m.type} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{formatMovementActor(m)}</p>
                      <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })} · {new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <p className={`ml-3 shrink-0 text-sm font-bold ${m.type === 'income' ? 'text-green-600' : m.type === 'transfer_to_joint' ? 'text-purple-600' : 'text-red-600'}`}>
                    {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                  </p>
                </button>
              ))}
              <button onClick={() => navigate('/movements')} className="w-full py-2 text-center text-xs font-medium text-[var(--theme-primary)] hover:underline">
                Ver todos los movimientos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSavings.map((saving) => (
                <button
                  key={saving.id}
                  type="button"
                  onClick={() => navigate('/savings')}
                  className="w-full rounded-2xl border border-gray-100 p-3 text-left transition hover:border-[var(--theme-primary)] dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-gray-950 dark:text-white">{saving.name}</p>
                    <p className="text-xs font-black text-[var(--theme-primary)]">{Math.min(100, Math.round((saving.current_amount / saving.target_amount) * 100))}%</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-[var(--theme-primary)]" style={{ width: `${Math.min(100, (saving.current_amount / saving.target_amount) * 100)}%` }} />
                  </div>
                </button>
              ))}
              <button onClick={() => navigate('/savings')} className="w-full py-2 text-center text-xs font-medium text-[var(--theme-primary)] hover:underline">
                Ver ahorros
              </button>
            </div>
          )}
        </div>
      )}

      {!isLinked && (
        <button
          onClick={() => navigate('/couple')}
          className="w-full rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-pink-50 p-4 text-left transition active:scale-[0.99] dark:border-blue-950 dark:from-blue-950/30 dark:to-pink-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-gray-900">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-950 dark:text-white">Conectar con mi pareja</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Crea o ingresa un cÃ³digo de conexiÃ³n</p>
            </div>
          </div>
        </button>
      )}



      {/* Tithe & Offerings inline under account card */}
      {!isCoupleMode && (
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/tithes')}
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary-light)]">
              <Cross className="h-4 w-4 text-[var(--theme-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Diezmo</p>
              <p className={`text-sm font-bold truncate ${displayTithe > 0 ? 'text-[var(--theme-primary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(displayTithe) : '...'}
              </p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/tithes')}
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-secondary-light)]">
              <Gift className="h-4 w-4 text-[var(--theme-secondary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Ofrendas</p>
              <p className={`text-sm font-bold truncate ${fastOfferingBalance > 0 ? 'text-[var(--theme-secondary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(fastOfferingBalance) : '...'}
              </p>
            </div>
          </motion.button>
        </div>
      )}

      {/* Quick modal */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setQuickOpen(null); setQuickAmount(''); setQuickDesc(''); }} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {quickOpen === 'income' ? 'Agregar ingreso' : 'Registrar gasto'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">DescripciÃ³n</label>
                <input
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={quickOpen === 'income' ? 'Ej: Salario' : 'Ej: Supermercado'}
                />
              </div>
              {quickOpen === 'income' && parseFloat(quickAmount || '0') > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Diezmo estimado (10%): <span className="font-bold">{formatCurrency(parseFloat(quickAmount) * 0.1)}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setQuickOpen(null); setQuickAmount(''); setQuickDesc(''); }}>Cancelar</Button>
                <Button className="flex-1" onClick={() => handleQuickSubmit()} loading={quickLoading} disabled={!quickAmount || parseFloat(quickAmount) <= 0}>
                  {quickOpen === 'income' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                  {quickOpen === 'income' ? 'Agregar' : 'Registrar'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* Movement detail modal */}
      {detailMovement && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDetailMovement(null)} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  detailMovement.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                  detailMovement.type === 'transfer_to_joint' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                  'bg-red-100 dark:bg-red-900/30 text-red-600'
                }`}>
                  <MovementIcon type={detailMovement.type} className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatMovementActor(detailMovement)}</p>
                  <p className="text-xs text-gray-400 capitalize">{detailMovement.type === 'transfer_to_joint' ? 'Transferencia a nuestro dinero' : detailMovement.type}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailMovement(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
              >
                âœ•
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Monto</span>
                <span className={`text-xl font-bold ${
                  detailMovement.type === 'income' ? 'text-green-600' :
                  detailMovement.type === 'transfer_to_joint' ? 'text-purple-600' :
                  'text-red-600'
                }`}>
                  {detailMovement.type === 'income' ? '+' : '-'}{formatCurrency(detailMovement.amount)}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">CategorÃ­a</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{detailMovement.category}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Fecha</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(detailMovement.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} â€” {new Date(detailMovement.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {detailMovement.is_couple ? 'Compartido' : 'Personal'}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setDetailMovement(null); navigate('/movements'); }}
              className="w-full mt-4 text-center text-xs text-[var(--theme-primary)] font-medium py-2 hover:underline"
            >
              Ver todos los movimientos
            </button>
          </motion.div>
        </div>
      )}
      {/* Tithing Management Modal */}
      {titheModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setTitheModalOpen(false); setManualTitheAmount(''); }} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-600" />
              GestiÃ³n de Diezmo
            </h3>


            <div className="space-y-4">
              {/* Pending Tithe Info */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Diezmo acumulado</p>
                  <p className="text-xl font-bold text-amber-900 dark:text-white mt-0.5">{formatCurrency(displayTithe)}</p>
                </div>
                {titheBalance > 0 && (
                  <Button
                    onClick={async () => {
                      await handlePayAllTithes();
                      setTitheModalOpen(false);
                    }}
                    loading={tithingLoading}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    Completar
                  </Button>
                )}
              </div>

              {/* Manual Tithe Input if autoTithe is disabled */}
              {!autoTithe && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Agregar diezmo manualmente</h4>
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={manualTitheAmount}
                        onChange={(e) => setManualTitheAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      onClick={handleManualTitheSubmit}
                      loading={manualTitheLoading}
                      disabled={!manualTitheAmount || parseFloat(manualTitheAmount) <= 0}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => { setTitheModalOpen(false); setManualTitheAmount(''); }}
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fast Offering Modal */}
      {fastOfferingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setFastOfferingModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-blue-600" />
              GestiÃ³n de Ofrenda de Ayuno
            </h3>


            <div className="space-y-4">
              {/* Accumulated offerings */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">Ofrendas acumuladas</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-white mt-0.5">{formatCurrency(fastOfferingBalance)}</p>
                </div>
                {fastOfferingBalance > 0 && (
                  <Button
                    onClick={handleCompleteFastOfferings}
                    loading={completingOfferings}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Completar
                  </Button>
                )}
              </div>

              {/* Form to add offering manual contribution */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Aportar Ofrenda</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Monto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={fastOfferingAmount}
                        onChange={(e) => setFastOfferingAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 mb-1 block">DescripciÃ³n</label>
                    <input
                      value={fastOfferingDesc}
                      onChange={(e) => setFastOfferingDesc(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Aporte de ayuno"
                    />
                  </div>
                  <Button 
                    onClick={handleFastOfferingSubmit} 
                    loading={fastOfferingLoading} 
                    disabled={!fastOfferingAmount || parseFloat(fastOfferingAmount) <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Aportar
                  </Button>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => setFastOfferingModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmModalConfig && (
        <ConfirmModal
          open={!!confirmModalConfig}
          onClose={() => setConfirmModalConfig(null)}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          warningText={confirmModalConfig.warningText}
          type={confirmModalConfig.type}
        />
      )}
    </motion.div>
  );
}
