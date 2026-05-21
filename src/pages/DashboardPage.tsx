import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Repeat2, User, Users, HeartHandshake, Percent } from 'lucide-react';
import { useProfileStore, useFinanceStore, useCoupleStore, useUIStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { getBalance, getMovements, createMovement, completeFastOfferings } from '../services/movementService';
import { getJointAccount, transferToJoint, transferToPartner } from '../services/jointAccountService';
import { useAppTheme } from '../hooks/useAppTheme';
import { getPendingTithes, payTithe as payTitheService, addManualTithe } from '../services/titheService';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { supabase } from '../lib/supabase';
import type { Movement, Tithe } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function DashboardPage() {
  const { profile } = useProfileStore();
  const { isLinked, partnerAlias, viewMode, setLinked, setPartner, resetCouple } = useCoupleStore();
  const {
    balance,
    jointBalance: cachedJointBalance,
    setBalance,
    setJointBalance: setCachedJointBalance,
    setMovements,
    movements,
    setTitheBalance,
    titheBalance,
  } = useFinanceStore();
  const { autoTithe, setAutoTithe } = useUIStore();
  const navigate = useNavigate();
  const appTheme = useAppTheme();

  const [jointBalance, setJointBalance] = useState(cachedJointBalance);
  const [jointAccountName, setJointAccountName] = useState('Nuestra cuenta');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'joint' | 'partner'>('joint');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

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
  const [balancesReady, setBalancesReady] = useState(false);
  const [displayedBalance, setDisplayedBalance] = useState<number | null>(null);
  const [quickActionPressed, setQuickActionPressed] = useState<'income' | 'transfer' | 'expense' | null>(null);

  const profileId = profile?.id;
  const profilePartnerId = profile?.partner_id;
  const profilePartnerAlias = profile?.partner_alias;
  const hasFinanceSnapshot = movements.length > 0 || balance !== 0 || cachedJointBalance !== 0 || titheBalance !== 0;

  const fastOfferingBalance = movements
    .filter((m) => m.category === 'Ofrenda de Ayuno' && !m.is_paid)
    .reduce((sum, m) => sum + m.amount, 0);

  const displayTithe = titheBalance;
  const activeAccountBalance = isCoupleMode && isLinked ? jointBalance : balance;
  const activeAccountKey = isCoupleMode && isLinked ? 'joint' : 'personal';
  const visibleBalance = displayedBalance ?? activeAccountBalance;

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

  const loadData = useCallback(async () => {
    if (!profileId) return;
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    if (!hasFinanceSnapshot) setBalancesReady(false);

    const [bal, movs, jointAcc, pending, latestProfile] = await Promise.all([
      getBalance(profileId),
      getMovements(profileId, isCoupleMode, profilePartnerId),
      isLinked ? getJointAccount(profileId) : Promise.resolve(null),
      getPendingTithes(profileId),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    if (requestId !== loadRequestRef.current) return;

    setBalance(bal);
    setMovements(movs);

    if (jointAcc) {
      setJointBalance(jointAcc.balance);
      setCachedJointBalance(jointAcc.balance);
      setJointAccountName(jointAcc.account_name || 'Nuestra cuenta');
    }

    setPendingTithes(pending);
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
  }, [profileId, profilePartnerId, profilePartnerAlias, setBalance, setCachedJointBalance, setMovements, isLinked, isCoupleMode, setTitheBalance, setLinked, setPartner, resetCouple, hasFinanceSnapshot]);

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
          loadData();
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
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, profile?.partner_id, loadData, setPartner]);

  const recentMovements = movements.slice(0, 5);

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
    if (m.type === 'income') return `${partnerAlias} ingresó dinero`;
    if (m.type === 'expense') return `${partnerAlias} realizó un gasto`;
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
          message: "¿Estás seguro de registrar este ingreso directamente en la cuenta compartida?",
          warningText: "💡 Consejo financiero: La forma recomendada es registrar el ingreso en tu cuenta personal y luego realizar una transferencia a \"Nuestro dinero\" para mantener un historial de movimientos ordenado.",
          type: 'warning',
          onConfirm: () => handleQuickSubmit(true),
        });
        return;
      } else {
        setConfirmModalConfig({
          title: "Confirmar Gasto Compartido",
          message: "¿Estás seguro de registrar este gasto en la cuenta de la pareja?",
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

  const handleTransfer = async () => {
    if (!profile) return;
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;
    setTransferring(true);
    setTransferError('');
    const result = transferTarget === 'joint'
      ? await transferToJoint(profile.id, amount)
      : await transferToPartner(profile.id, amount);
    if (result.success) {
      setTransferOpen(false);
      setTransferAmount('');
      setTransferTarget('joint');
      loadData();
    } else {
      setTransferError(result.error || 'Error al transferir');
    }
    setTransferring(false);
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
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
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
            onClick={() => playQuickAction('transfer', () => setTransferOpen(true))}
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
        const accName = isJoint ? jointAccountName : (profile?.account_name || 'Mi cuenta');
        return (
          <motion.div
            onClick={() => navigate(isJoint ? '/accounts?type=joint' : '/accounts?type=personal')}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer shadow-lg shadow-black/5 dark:shadow-black/30"
            style={{ background: `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 bg-white/15" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-1/2 -translate-x-1/2 bg-white/10" />
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Crea o ingresa un código de conexión</p>
            </div>
          </div>
        </button>
      )}

      {/* Iglesia */}
      {!isCoupleMode && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Tithing */}
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={() => setTitheModalOpen(true)}
              className={`rounded-xl p-3 cursor-pointer border transition-all ${
                titheBalance > 0
                  ? 'bg-[var(--theme-primary-light)] border-[var(--theme-card-border)]'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}
            >
              <p className="text-[11px] font-semibold text-[var(--theme-primary)]">Diezmo</p>
              <p className={`text-base font-bold mt-0.5 ${titheBalance > 0 ? 'text-[var(--theme-primary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(displayTithe) : 'Cargando...'}
              </p>
            </motion.div>

            {/* Fast Offering */}
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={() => setFastOfferingModalOpen(true)}
              className={`rounded-xl p-3 cursor-pointer border transition-all ${
                fastOfferingBalance > 0
                  ? 'bg-[var(--theme-secondary-light)] border-[var(--theme-card-border)]'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}
            >
              <p className="text-[11px] font-semibold text-[var(--theme-secondary)]">Ofrendas</p>
              <p className={`text-base font-bold mt-0.5 ${fastOfferingBalance > 0 ? 'text-[var(--theme-secondary)]' : 'text-gray-900 dark:text-white'}`}>
                {balancesReady || hasFinanceSnapshot ? formatCurrency(fastOfferingBalance) : 'Cargando...'}
              </p>
            </motion.div>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Descuento automático (10%)</p>
            <Switch checked={autoTithe} onChange={setAutoTithe} />
          </div>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Descripción</label>
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

      {/* Transfer modal */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setTransferOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Transferir dinero</h3>
            {transferError && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">{transferError}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-4">Saldo disponible: {formatCurrency(balance)}</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferTarget('joint')}
                className={`rounded-2xl border p-3 text-left transition ${
                  transferTarget === 'joint'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)]'
                    : 'border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="text-sm font-black">Cuenta comun</p>
                <p className="mt-1 text-[11px] font-bold opacity-70">{jointAccountName}</p>
              </button>
              <button
                type="button"
                onClick={() => setTransferTarget('partner')}
                className={`rounded-2xl border p-3 text-left transition ${
                  transferTarget === 'partner'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)]'
                    : 'border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="text-sm font-black">Mi pareja</p>
                <p className="mt-1 text-[11px] font-bold opacity-70">{partnerAlias || 'Cuenta personal'}</p>
              </button>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setTransferOpen(false); setTransferTarget('joint'); }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleTransfer} loading={transferring} disabled={!transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > balance}>
                <ArrowLeftRight className="w-4 h-4" /> Enviar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Recent movements */}
      {recentMovements.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
            Últimos movimientos
          </h3>
          <div className="space-y-1">
            {recentMovements.map((m) => (
              <button
                key={m.id}
                onClick={() => setDetailMovement(m)}
                className="w-full flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors -mx-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                    m.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                    m.type === 'transfer_to_joint' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                    'bg-red-100 dark:bg-red-900/30 text-red-600'
                  }`}>
                    {m.type === 'income' ? '+' : m.type === 'transfer_to_joint' ? '↗' : '−'}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{formatMovementActor(m)}</p>
                    <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })} · {new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ml-3 ${
                  m.type === 'income' ? 'text-green-600' :
                  m.type === 'transfer_to_joint' ? 'text-purple-600' :
                  'text-red-600'
                }`}>
                  {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                </p>
              </button>
            ))}
            <button
              onClick={() => navigate('/movements')}
              className="w-full text-center text-xs text-[var(--theme-primary)] font-medium py-2 hover:underline"
            >
              Ver todos los movimientos
            </button>
          </div>
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                  detailMovement.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                  detailMovement.type === 'transfer_to_joint' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                  'bg-red-100 dark:bg-red-900/30 text-red-600'
                }`}>
                  {detailMovement.type === 'income' ? '+' : detailMovement.type === 'transfer_to_joint' ? '↗' : '−'}
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
                ✕
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
                <span className="text-sm text-gray-500">Categoría</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{detailMovement.category}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Fecha</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(detailMovement.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(detailMovement.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
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
              Gestión de Diezmo
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
              Gestión de Ofrenda de Ayuno
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
                    <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Descripción</label>
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
