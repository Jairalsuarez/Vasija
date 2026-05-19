import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus } from 'lucide-react';
import { useFinanceStore, useProfileStore, useCoupleStore } from '../store';
import { formatCurrency, formatDateShort } from '../lib/formatters';
import { AddMovementModal } from '../components/finances/AddMovementModal';
import { getMovements, getBalance } from '../services/movementService';
import { Button } from '../components/ui/Button';

type FilterPeriod = 'all' | 'day' | 'week' | 'month';

export function MovementsPage() {
  const { movements, setMovements, setBalance } = useFinanceStore();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const isCouple = viewMode === 'couple';

  const loadData = useCallback(async () => {
    if (!profile) return;
    const data = await getMovements(profile.id, isCouple, profile.partner_id);
    setMovements(data);
    const bal = await getBalance(profile.id);
    setBalance(bal);
  }, [profile, setMovements, setBalance, isCouple]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = movements.filter((m) => {
    const matchesSearch = m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (period === 'all') return true;
    const now = new Date();
    const date = new Date(m.date);
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 3600 * 24);
    if (period === 'day') return days <= 1;
    if (period === 'week') return days <= 7;
    if (period === 'month') return days <= 30;
    return true;
  });

  const totalIncome = filtered.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalExpense = filtered.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Movimientos</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nuevo
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar movimientos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Filter className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex gap-2 flex-wrap"
        >
          {(['all', 'day', 'week', 'month'] as FilterPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {p === 'all' ? 'Todo' : p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </motion.div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-200 dark:border-green-900">
            <p className="text-xs text-green-600 dark:text-green-400">Ingresos</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">+{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 border border-red-200 dark:border-red-900">
            <p className="text-xs text-red-600 dark:text-red-400">Gastos</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">-{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-600">Sin movimientos aún</p>
            <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">Agrega tu primer ingreso o gasto</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  m.type === 'income'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {m.type === 'income' ? '↑' : '↓'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{m.category}</span>
                    <span>·</span>
                    <span>{formatDateShort(m.date)}</span>
                    <span>·</span>
                    <span>{new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <p className={`text-sm font-bold ${
                m.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
              </p>
            </div>
          ))
        )}
      </div>

      <AddMovementModal open={modalOpen} onClose={() => { setModalOpen(false); loadData(); }} isCouple={isCouple} />
    </motion.div>
  );
}
