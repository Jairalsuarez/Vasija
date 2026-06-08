import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Church, HandCoins, Plus, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { formatCurrency } from '../lib/formatters';
import { useCoupleStore, useProfileStore, useUIStore } from '../store';
import { completeFastOfferings, createMovement, getMovements } from '../services/movementService';
import { addManualTithe, getPendingTithes, payTithe } from '../services/titheService';
import type { Tithe } from '../types';

export function TithesPage() {
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const { autoTithe, setAutoTithe } = useUIStore();
  const isCouple = viewMode === 'couple';
  const [tab, setTab] = useState<'tithe' | 'offerings'>('tithe');
  const [pendingTithes, setPendingTithes] = useState<Tithe[]>([]);
  const [offeringBalance, setOfferingBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Ofrenda de ayuno');
  const [loading, setLoading] = useState(false);

  const titheTotal = useMemo(() => pendingTithes.reduce((sum, item) => sum + item.amount, 0), [pendingTithes]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [tithes, movements] = await Promise.all([
      getPendingTithes(profile.id),
      getMovements(profile.id, isCouple, profile.partner_id),
    ]);
    setPendingTithes(tithes);
    setOfferingBalance(
      movements
        .filter((item) => item.category === 'Ofrenda de Ayuno' && !item.is_paid)
        .reduce((sum, item) => sum + item.amount, 0),
    );
  }, [isCouple, profile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const completeTithe = async () => {
    if (!profile || pendingTithes.length === 0) return;
    setLoading(true);
    for (const item of pendingTithes) {
      await payTithe(item.id, profile.id, item.amount, isCouple);
    }
    await loadData();
    setLoading(false);
  };

  const addTithe = async () => {
    if (!profile || !amount) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setLoading(true);
    await addManualTithe(profile.id, value);
    setAmount('');
    await loadData();
    setLoading(false);
  };

  const addOffering = async () => {
    if (!profile || !amount) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setLoading(true);
    await createMovement({
      user_id: profile.id,
      type: 'expense',
      amount: value,
      description: description.trim() || 'Ofrenda de ayuno',
      category: 'Ofrenda de Ayuno',
      date: new Date().toISOString().split('T')[0],
      is_couple: isCouple,
    });
    setAmount('');
    setDescription('Ofrenda de ayuno');
    await loadData();
    setLoading(false);
  };

  const completeOfferings = async () => {
    if (!profile || offeringBalance <= 0) return;
    setLoading(true);
    await completeFastOfferings(profile.id, isCouple);
    await loadData();
    setLoading(false);
  };

  const activeTotal = tab === 'tithe' ? titheTotal : offeringBalance;

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-5">
      <div>
        <h2 className="text-xl font-black text-gray-950 dark:text-white">Diezmo y ofrendas de ayuno</h2>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
          Completa tus aportes con calma y claridad.
        </p>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-white to-blue-100 p-5 shadow-sm dark:from-amber-950/20 dark:via-white/[0.04] dark:to-blue-950/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {tab === 'tithe' ? 'Diezmo pendiente' : 'Ofrendas pendientes'}
            </p>
            <p className="mt-1 text-4xl font-black text-gray-950 dark:text-white">{formatCurrency(activeTotal)}</p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/80 text-amber-600 shadow-sm dark:bg-white/10">
            {tab === 'tithe' ? <Church className="h-7 w-7" /> : <HandCoins className="h-7 w-7" />}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1 dark:bg-white/10">
        {[
          ['tithe', 'Diezmo'],
          ['offerings', 'Ofrendas'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value as 'tithe' | 'offerings');
              setAmount('');
            }}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === value ? 'bg-white text-gray-950 shadow-sm dark:bg-[var(--theme-card-bg)] dark:text-white' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tithe' ? (
        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-gray-950 dark:text-white">Descuento automático</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Calcula el 10% al registrar ingresos personales.</p>
            </div>
            <Switch checked={autoTithe} onChange={setAutoTithe} />
          </div>
          {!autoTithe && (
            <div className="space-y-3">
              <Input label="Agregar diezmo manual" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
              <Button onClick={addTithe} loading={loading} disabled={!amount} className="w-full">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
          )}
          <Button onClick={completeTithe} loading={loading} disabled={titheTotal <= 0} className="mt-3 w-full">
            <Sparkles className="h-4 w-4" /> Completar diezmo
          </Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          <Input label="Monto de ofrenda" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          <Input label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej: Aporte de ayuno" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={completeOfferings} loading={loading} disabled={offeringBalance <= 0}>
              Completar
            </Button>
            <Button onClick={addOffering} loading={loading} disabled={!amount}>
              <Plus className="h-4 w-4" /> Aportar
            </Button>
          </div>
        </section>
      )}
    </motion.div>
  );
}
