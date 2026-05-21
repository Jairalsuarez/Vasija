import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeDollarSign, Home, PiggyBank, Plus, Target, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCoupleStore, useFinanceStore, useProfileStore } from '../store';
import { createMovement } from '../services/movementService';
import { getDebts } from '../services/debtService';
import { getGoals } from '../services/goalService';
import { getSavings } from '../services/savingService';
import { formatCurrency } from '../lib/formatters';
import type { Saving } from '../types';

const today = () => new Date().toISOString().split('T')[0];

const expenseSections = [
  { name: 'Hogar', category: 'Hogar', icon: Home },
  { name: 'Deudas', category: 'Deudas', icon: Wallet },
  { name: 'Ahorro', category: 'Ahorro', icon: PiggyBank },
  { name: 'Metas', category: 'Metas', icon: Target },
];

const homeNiches = ['Arriendo', 'Comida', 'Luz', 'Agua', 'Internet', 'Mantenimiento'];

export function ExpensePage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const { debts, goals, setDebts, setGoals } = useFinanceStore();
  const isCouple = viewMode === 'couple';
  const [section, setSection] = useState<(typeof expenseSections)[number] | null>(null);
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [savings, setSavings] = useState<Saving[]>([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [debtData, goalData, savingData] = await Promise.all([
      getDebts(profile.id, isCouple),
      getGoals(profile.id, isCouple),
      getSavings(profile.id, isCouple),
    ]);
    setDebts(debtData);
    setGoals(goalData);
    setSavings(savingData);
  }, [isCouple, profile, setDebts, setGoals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sectionItems = useMemo(() => {
    if (!section) return [];
    if (section.name === 'Hogar') return homeNiches.map((name) => ({ id: name, name, helper: 'Hogar' }));
    if (section.name === 'Deudas') {
      return debts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        helper: `${formatCurrency(Math.max(debt.total_amount - debt.paid_amount, 0))} pendiente`,
      }));
    }
    if (section.name === 'Ahorro') {
      return savings.map((saving) => ({
        id: saving.id,
        name: saving.name,
        helper: `${formatCurrency(saving.current_amount)} guardado`,
      }));
    }
    if (section.name === 'Metas') {
      return goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        helper: `${formatCurrency(goal.current_amount)} de ${formatCurrency(goal.target_amount)}`,
      }));
    }
    return [];
  }, [debts, goals, savings, section]);

  const title = useMemo(() => {
    if (!section) return 'Gasto rapido';
    if (niche === 'Otro') return customNiche.trim() || 'Otro gasto';
    return niche || section.name;
  }, [customNiche, niche, section]);

  const emptyAction = useMemo(() => {
    if (!section) return null;
    if (section.name === 'Deudas') return { label: 'Crear deuda', to: '/debts' };
    if (section.name === 'Ahorro') return { label: 'Crear ahorro', to: '/savings' };
    if (section.name === 'Metas') return { label: 'Crear meta', to: '/goals' };
    return null;
  }, [section]);

  const resetQuick = () => {
    setSection(null);
    setNiche('');
    setCustomNiche('');
    setDescription('');
    setDate(today());
  };

  const handleBack = () => {
    if (section) {
      resetQuick();
      return;
    }
    navigate('/dashboard');
  };

  const submit = async () => {
    if (!profile) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Pon un monto valido.');
      return;
    }
    setLoading(true);
    setError('');
    const { movement } = await createMovement({
      user_id: profile.id,
      type: 'expense',
      amount: value,
      description: description.trim() || title,
      category: section?.category || 'Gasto',
      date,
      is_couple: isCouple,
    });
    if (movement) {
      sessionStorage.setItem('vasija:balance-sound', 'expense');
      sessionStorage.setItem('vasija:balance-delta', String(value));
    }
    navigate('/dashboard');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="rounded-xl border border-gray-200 p-2 dark:border-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">Gasto</h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{isCouple ? 'Cuenta de pareja' : 'Cuenta personal'}</p>
        </div>
      </div>

      <section>
        <p className="mb-3 text-sm font-black text-gray-950 dark:text-white">Detallar gasto</p>
        <div className="grid grid-cols-2 gap-3">
          {expenseSections.map((item) => {
            const Icon = item.icon;
            const active = section?.name === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  if (active) {
                    resetQuick();
                    return;
                  }
                  setSection(item);
                  setNiche('');
                  setCustomNiche('');
                }}
                className={`flex min-h-28 flex-col items-center justify-center rounded-3xl border p-4 text-center transition active:scale-[0.98] ${
                  active
                    ? 'border-[var(--theme-secondary)] bg-[var(--theme-secondary-light)]'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[var(--theme-card-bg)]'
                }`}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-secondary-light)]">
                  <Icon className="h-7 w-7 text-[var(--theme-secondary)]" />
                </span>
                <p className="text-sm font-black text-gray-950 dark:text-white">{item.name}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
        <h3 className="mb-4 text-lg font-black text-gray-950 dark:text-white">{title}</h3>

        {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="space-y-4">
          {!section && (
            <Input label="Monto" type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          )}
          {section && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {sectionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNiche(niche === item.name ? '' : item.name)}
                    className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border p-3 text-center transition active:scale-[0.98] ${
                      niche === item.name
                        ? 'border-[var(--theme-secondary)] bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]'
                        : 'border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200'
                    }`}
                  >
                    <span className="block text-sm font-black">{item.name}</span>
                    <span className="mt-1 block text-[11px] font-bold opacity-70">{item.helper}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNiche(niche === 'Otro' ? '' : 'Otro')}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border border-dashed p-3 text-center transition active:scale-[0.98] ${
                    niche === 'Otro'
                      ? 'border-[var(--theme-secondary)] bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]'
                      : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  <Plus className="mb-2 h-5 w-5" />
                  <span className="block text-sm font-black">Otro</span>
                </button>
              </div>
              {sectionItems.length === 0 && emptyAction && (
                <button
                  type="button"
                  onClick={() => navigate(emptyAction.to)}
                  className="w-full rounded-2xl border border-dashed border-[var(--theme-secondary)] bg-[var(--theme-secondary-light)] p-4 text-sm font-black text-[var(--theme-secondary)]"
                >
                  {emptyAction.label}
                </button>
              )}
              {niche === 'Otro' && (
                <Input label="Que gasto es" placeholder="Ej: medicina, transporte, regalo" value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} />
              )}
              {niche && (
                <>
                  <Input label="Monto" type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <Input label="Fecha del gasto" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  <Input label="Descripcion opcional" placeholder="Ej: pago realizado" value={description} onChange={(e) => setDescription(e.target.value)} />
                </>
              )}
            </>
          )}
          <Button onClick={submit} loading={loading} disabled={!amount || (!!section && !niche)} className="w-full py-3 font-black">
            <BadgeDollarSign className="h-4 w-4" />
            Confirmar gasto
          </Button>
        </div>
      </section>
    </motion.div>
  );
}
