import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Plane, Heart, PiggyBank, Plus } from 'lucide-react';
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Metas</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nueva meta
        </Button>
      </div>

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
            const remaining = goal.target_amount - goal.current_amount;
            return (
              <div key={goal.id} className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${meta.barColor.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{goal.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{goal.category === 'temple' ? 'Templo' : goal.category}</p>
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
                  <p className="text-xs text-gray-400">
                    Progreso: {formatCurrency(goal.current_amount)}
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
              </div>
            );
          })}
        </div>
      )}

      <AddGoalModal open={modalOpen} onClose={() => { setModalOpen(false); loadData(); }} isCouple={isCouple} />
    </motion.div>
  );
}
