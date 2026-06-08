import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Plane, Heart, PiggyBank, Plus } from 'lucide-react';
import { useFinanceStore, useProfileStore, useCoupleStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { AddGoalModal } from '../components/finances/AddGoalModal';
import { getGoals, contributeToGoal } from '../services/goalService';

const categoryMeta: Record<string, { icon: typeof Target; bg: string; barColor: string }> = {
  savings: { icon: PiggyBank, bg: 'bg-blue-100 dark:bg-blue-900/30', barColor: 'bg-blue-600' },
  vacation: { icon: Plane, bg: 'bg-green-100 dark:bg-green-900/30', barColor: 'bg-green-600' },
  temple: { icon: Heart, bg: 'bg-amber-100 dark:bg-amber-900/30', barColor: 'bg-amber-600' },
  other: { icon: Target, bg: 'bg-purple-100 dark:bg-purple-900/30', barColor: 'bg-purple-600' },
};

export function GoalsPage() {
  const { goals, setGoals } = useFinanceStore();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const [modalOpen, setModalOpen] = useState(false);

  const isCouple = viewMode === 'couple';
  const totalGoal = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const globalProgress = totalGoal > 0 ? Math.round((totalCurrent / totalGoal) * 100) : 0;

  const loadData = useCallback(async () => {
    if (!profile) return;
    const data = await getGoals(profile.id, isCouple);
    setGoals(data);
  }, [profile, setGoals, isCouple]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleContribute = async (goalId: string, amount: number) => {
    const ok = await contributeToGoal(goalId, amount);
    if (ok) loadData();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">Metas</h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{isCouple ? 'Sueños en pareja' : 'Tus próximos logros'}</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nueva meta
        </Button>
      </div>

      {goals.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] p-5 text-white shadow-lg shadow-[var(--theme-primary)]/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide opacity-75">Avance general</p>
              <p className="mt-1 text-4xl font-black">{globalProgress}%</p>
              <p className="mt-1 text-xs font-bold opacity-80">{formatCurrency(totalCurrent)} de {formatCurrency(totalGoal)}</p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/18">
              <Sparkles className="h-7 w-7" />
            </span>
          </div>
        </section>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Sin metas aún</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Define tus objetivos financieros</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => {
            const meta = categoryMeta[goal.category] || categoryMeta.other;
            const Icon = meta.icon;
            const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
            const progress = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
            const status = progress >= 100 ? 'Meta cumplida' : progress >= 70 ? 'Ya falta poquito' : progress >= 35 ? 'Va tomando forma' : 'Primeros pasos';
            return (
              <motion.div key={goal.id} layout className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${meta.barColor.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{goal.name}</p>
                      <p className="text-xs font-bold text-gray-400">{status}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(goal.target_amount)}
                  </p>
                </div>
                <ProgressBar
                  value={goal.current_amount}
                  max={goal.target_amount}
                  size="md"
                  color={meta.barColor}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-bold text-gray-400">
                    Faltan {formatCurrency(remaining)}
                  </p>
                  {remaining > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleContribute(goal.id, Math.min(50, remaining))}
                    >
                      Aportar $50
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddGoalModal open={modalOpen} onClose={() => { setModalOpen(false); loadData(); }} isCouple={isCouple} />
    </motion.div>
  );
}
