import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Target, Wallet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatCurrency } from '../lib/formatters';
import { useCoupleStore, useProfileStore } from '../store';
import { createSaving, getSavings } from '../services/savingService';
import type { Saving } from '../types';

export function SavingsPage() {
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const isCouple = viewMode === 'couple';
  const [plans, setPlans] = useState<Saving[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');

  useEffect(() => {
    if (!profile) return;
    getSavings(profile.id, isCouple).then(setPlans);
  }, [isCouple, profile]);

  const totalSaved = useMemo(() => plans.reduce((sum, plan) => sum + plan.current_amount, 0), [plans]);

  const savePlan = () => {
    if (!profile) return;
    const cleanName = name.trim();
    const targetValue = parseFloat(target);
    const currentValue = parseFloat(current || '0');
    if (!cleanName || isNaN(targetValue) || targetValue <= 0) return;

    createSaving({
      user_id: profile.id,
      name: cleanName,
      target_amount: targetValue,
      current_amount: isNaN(currentValue) ? 0 : currentValue,
      is_couple: isCouple,
    }).then((saved) => {
      if (saved) setPlans((currentPlans) => [saved, ...currentPlans]);
    });
    setName('');
    setTarget('');
    setCurrent('');
    setCreating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">Ahorros</h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {isCouple ? 'Ahorro de pareja' : 'Ahorro personal'}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] p-5 text-white shadow-lg shadow-[var(--theme-primary)]/20">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18">
            <PiggyBank className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-bold opacity-80">Guardado</p>
            <p className="text-3xl font-black">{formatCurrency(totalSaved)}</p>
          </div>
        </div>
      </section>

      {creating && (
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          <h3 className="mb-4 text-lg font-black text-gray-950 dark:text-white">Nuevo ahorro</h3>
          <div className="space-y-3">
            <Input label="Nombre" placeholder="Ej: emergencia, casa, estudios" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Meta" type="number" inputMode="decimal" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} />
            <Input label="Ya guardado" type="number" inputMode="decimal" placeholder="0.00" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button onClick={savePlan}>Guardar</Button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)]">
                  <Wallet className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-black text-gray-950 dark:text-white">{plan.name}</p>
                  <p className="text-xs font-bold text-gray-400">{formatCurrency(plan.current_amount)} guardado</p>
                </div>
              </div>
              <p className="text-sm font-black text-gray-950 dark:text-white">{formatCurrency(plan.target_amount)}</p>
            </div>
            <ProgressBar value={plan.current_amount} max={plan.target_amount} size="sm" color="bg-[var(--theme-primary)]" showPercentage />
          </article>
        ))}
      </div>

      {plans.length === 0 && !creating && (
        <div className="py-16 text-center">
          <Target className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-bold text-gray-500 dark:text-gray-400">Aun no tienes ahorros</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-sm font-black text-[var(--theme-primary)]">
            Crear el primero
          </button>
        </div>
      )}
    </motion.div>
  );
}
