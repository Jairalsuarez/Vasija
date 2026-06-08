import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Infinity, Hash, CheckCircle, Plus } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.25, ease },
  }),
};
import { useFinanceStore, useProfileStore, useCoupleStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { AddDebtModal } from '../components/finances/AddDebtModal';
import { getDebts, payInstallment } from '../services/debtService';

export function DebtsPage() {
  const { debts, setDebts } = useFinanceStore();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const [modalOpen, setModalOpen] = useState(false);

  const isCouple = viewMode === 'couple';

  const loadData = useCallback(async () => {
    if (!profile) return;
    const data = await getDebts(profile.id, isCouple);
    setDebts(data);
  }, [profile, setDebts, isCouple]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePay = async (debtId: string, amount: number) => {
    const ok = await payInstallment(debtId, amount);
    if (ok) loadData();
  };

  const finiteDebts = debts.filter((d) => d.type === 'finite');
  const infiniteDebts = debts.filter((d) => d.type === 'infinite');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Deudas</h2>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {isCouple ? 'Deudas en pareja' : 'Deudas personales'}
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nueva deuda
        </Button>
      </div>

      {finiteDebts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Finitas</h3>
          </div>
          <div className="space-y-3">
            {finiteDebts.map((debt, i) => (
              <motion.div
                key={debt.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{debt.name}</p>
                    <p className="text-xs text-gray-400">
                      {debt.installments_paid} / {debt.installments_total} cuotas
                    </p>
                  </div>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(debt.total_amount)}</p>
                </div>
                <ProgressBar
                  value={debt.installments_paid}
                  max={debt.installments_total}
                  size="sm"
                  color="bg-blue-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    Pagado: {formatCurrency(debt.paid_amount)}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePay(debt.id, debt.total_amount / debt.installments_total)}
                    disabled={debt.installments_paid >= debt.installments_total}
                  >
                    Pagar cuota
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {infiniteDebts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Infinity className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Infinitas</h3>
          </div>
          <div className="space-y-3">
            {infiniteDebts.map((debt, i) => (
              <motion.div
                key={debt.id}
                custom={i + finiteDebts.length}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{debt.name}</p>
                    <p className="text-xs text-gray-400">Total: {formatCurrency(debt.total_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(debt.total_amount - debt.paid_amount)}</p>
                    <p className="text-xs text-gray-400">restante</p>
                  </div>
                </div>
                <ProgressBar
                  value={debt.paid_amount}
                  max={debt.total_amount}
                  size="sm"
                  color="bg-purple-600"
                  showPercentage
                />
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePay(debt.id, Math.min(100, debt.total_amount * 0.1))}
                  >
                    Abonar
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {debts.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Sin deudas registradas</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">¡Excelente! Mantén ese control financiero.</p>
        </div>
      )}

      <AddDebtModal open={modalOpen} onClose={() => { setModalOpen(false); loadData(); }} isCouple={isCouple} />
    </motion.div>
  );
}
