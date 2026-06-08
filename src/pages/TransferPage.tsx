import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowLeftRight, Check, Send, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { getThemeColor } from '../config/themes';
import { formatCurrency } from '../lib/formatters';
import { getBalance } from '../services/movementService';
import { getJointAccount, transferToJoint, transferToPartner } from '../services/jointAccountService';
import { useCoupleStore, useFinanceStore, useProfileStore } from '../store';
import { supabase } from '../lib/supabase';

type TransferTarget = 'joint' | 'partner';

export function TransferPage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { isLinked, partnerAlias, partnerName } = useCoupleStore();
  const {
    balance,
    jointBalance,
    jointAccountName,
    jointAccountTheme,
    setBalance,
    setJointBalance,
    setJointAccountMeta,
  } = useFinanceStore();

  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState<TransferTarget>('joint');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceBalance, setSourceBalance] = useState(balance);

  const partnerLabel = partnerAlias || partnerName || 'Mi pareja';
  const sourceName = profile?.account_name || profile?.name || 'Mi cuenta';
  const jointColors = getThemeColor(jointAccountTheme);
  const modeGradient = 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))';
  const reverseModeGradient = 'linear-gradient(135deg, var(--theme-secondary), var(--theme-primary))';
  const parsedAmount = Number(amount);
  const canSubmit = parsedAmount > 0 && parsedAmount <= sourceBalance && isLinked;

  const targetCards = useMemo(
    () => [
      {
        id: 'joint' as const,
        title: jointAccountName || 'Nuestra cuenta',
        kicker: 'Cuenta compartida',
        balance: jointBalance,
        icon: Users,
        background: modeGradient,
        accent: 'rgba(255,255,255,0.16)',
      },
      {
        id: 'partner' as const,
        title: partnerLabel,
        kicker: 'Cuenta de destino',
        balance: null,
        icon: User,
        background: reverseModeGradient,
        accent: 'rgba(255,255,255,0.16)',
      },
    ],
    [jointAccountName, jointBalance, modeGradient, partnerLabel, reverseModeGradient],
  );

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const sync = async () => {
      const [personalBalance, jointAccount] = await Promise.all([
        getBalance(profile.id),
        isLinked ? getJointAccount(profile.id) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setSourceBalance(personalBalance);
      setBalance(personalBalance);
      if (jointAccount) {
        const nextName = jointAccount.account_name || 'Nuestra cuenta';
        const nextTheme = jointAccount.theme || 'purple';
        setJointBalance(jointAccount.balance);
        setJointAccountMeta({ id: jointAccount.id, name: nextName, theme: nextTheme });
      }
    };

    void sync();

    const channel = supabase
      .channel(`transfer-live-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => void sync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'joint_accounts' }, () => void sync())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isLinked, profile?.id, setBalance, setJointAccountMeta, setJointBalance]);

  const submit = async () => {
    if (!profile || !canSubmit) return;
    setLoading(true);
    setError('');
    const result = target === 'joint'
      ? await transferToJoint(profile.id, parsedAmount)
      : await transferToPartner(profile.id, parsedAmount);

    if (result.success) {
      sessionStorage.setItem('vasija:balance-sound', 'expense');
      sessionStorage.setItem('vasija:balance-start', String(sourceBalance));
      sessionStorage.setItem('vasija:balance-delta', String(parsedAmount));
      navigate('/dashboard');
    } else {
      setError(result.error || 'No se pudo completar la transferencia.');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-3xl space-y-5"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-black text-gray-950 dark:text-white">Transferir</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <motion.section
          layout
          className="relative min-h-[190px] overflow-hidden rounded-2xl p-5 text-white shadow-xl shadow-gray-900/10"
          style={{ background: modeGradient }}
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center gap-2 text-white/90">
              <User className="h-5 w-5" />
              <span className="text-xs font-bold">Desde tu cuenta</span>
            </div>
            <div>
              <h3 className="truncate text-2xl font-black">{sourceName}</h3>
              <p className="mt-3 text-3xl font-black">{formatCurrency(sourceBalance)}</p>
            </div>
          </div>
        </motion.section>

        <div className="flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 8, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
          >
            <ArrowLeftRight className="h-6 w-6" />
          </motion.div>
        </div>

        <section className="grid gap-3">
          {targetCards.map((card, index) => {
            const Icon = card.icon;
            const active = target === card.id;
            return (
              <motion.button
                key={card.id}
                type="button"
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setTarget(card.id)}
                className={`relative min-h-[132px] overflow-hidden rounded-2xl p-4 text-left text-white shadow-lg transition ${
                  active ? 'ring-4 ring-[var(--theme-primary-light)]' : 'opacity-90'
                }`}
                style={{ background: card.background }}
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full" style={{ backgroundColor: card.accent }} />
                {card.id === 'joint' && (
                  <div
                    className="absolute bottom-4 right-4 h-7 w-7 rounded-full border border-white/45 shadow-lg shadow-black/10"
                    style={{ backgroundColor: jointColors.color }}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-white/90">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate text-xs font-bold">{card.kicker}</span>
                    </div>
                    {active && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-950">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="truncate text-xl font-black">{card.title}</h3>
                    {card.balance !== null && <p className="mt-2 text-2xl font-black">{formatCurrency(card.balance)}</p>}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
        {error && (
          <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600 dark:border-red-950 dark:bg-red-950/25 dark:text-red-300">
            {error}
          </div>
        )}
        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Monto</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-9 pr-4 text-2xl font-black text-gray-950 outline-none transition focus:border-[var(--theme-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--theme-primary-light)] dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-900"
            placeholder="0.00"
            autoFocus
          />
        </div>
        <Button className="mt-4 w-full py-3 font-black" onClick={submit} loading={loading} disabled={!canSubmit}>
          <Send className="h-4 w-4" />
          Enviar
        </Button>
      </section>
    </motion.div>
  );
}
