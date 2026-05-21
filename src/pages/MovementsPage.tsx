import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinanceStore, useProfileStore, useCoupleStore } from '../store';
import { formatCurrency, formatDateShort } from '../lib/formatters';
import { AddMovementModal } from '../components/finances/AddMovementModal';
import { getMovements, getBalance } from '../services/movementService';
import { Button } from '../components/ui/Button';
import type { Movement } from '../types';

type FilterPeriod = 'all' | 'day' | 'week' | 'month';

const ease = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease },
  }),
};

const typeLabels: Record<string, { label: string; icon: string }> = {
  income: { label: 'Ingreso', icon: '+' },
  expense: { label: 'Gasto', icon: '−' },
  tithe: { label: 'Diezmo', icon: '†' },
  transfer_to_joint: { label: 'Transferencia', icon: '↗' },
};

export function MovementsPage() {
  const navigate = useNavigate();
  const { movements, setMovements, setBalance } = useFinanceStore();
  const { profile } = useProfileStore();
  const { viewMode, partnerAlias, setViewMode } = useCoupleStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailMovement, setDetailMovement] = useState<Movement | null>(null);
  const [consumedMovementId, setConsumedMovementId] = useState<string | null>(null);

  const isCouple = viewMode === 'couple';
  const movementId = searchParams.get('movement');
  const scope = searchParams.get('scope');

  const loadData = useCallback(async () => {
    if (!profile) return;
    const data = await getMovements(profile.id, isCouple, profile.partner_id);
    setMovements(data);
    const bal = await getBalance(profile.id);
    setBalance(bal);
  }, [profile, setMovements, setBalance, isCouple]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (scope === 'couple') setViewMode('couple');
    if (scope === 'personal') setViewMode('personal');
  }, [scope, setViewMode]);

  useEffect(() => {
    if (!movementId) return;
    if (consumedMovementId === movementId) return;
    if (detailMovement?.id === movementId) return;
    const target = movements.find((m) => m.id === movementId);
    if (target) {
      setDetailMovement(target);
      setConsumedMovementId(movementId);
      navigate('/movements', { replace: true });
    }
  }, [movementId, movements, detailMovement?.id, consumedMovementId, navigate]);

  const closeDetailMovement = () => {
    setDetailMovement(null);
  };

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
        <Button size="sm" onClick={() => navigate('/expense')}>
          <Plus className="w-4 h-4" /> Nuevo
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
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
                  ? 'bg-[var(--theme-primary)] text-white'
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
          <div className="bg-[var(--theme-primary-light)] rounded-xl p-3 border border-[var(--theme-card-border)]">
            <p className="text-xs text-[var(--theme-primary)]">Ingresos</p>
            <p className="text-lg font-bold text-[var(--theme-primary)]">+{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-[var(--theme-secondary-light)] rounded-xl p-3 border border-[var(--theme-card-border)]">
            <p className="text-xs text-[var(--theme-secondary)]">Gastos</p>
            <p className="text-lg font-bold text-[var(--theme-secondary)]">-{formatCurrency(totalExpense)}</p>
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
          filtered.map((m, i) => {
            const isPos = m.type === 'income';
            const ctx = typeLabels[m.type] || { label: m.type, icon: '?' };
            let displayDesc = m.description;
            if (profile) {
              const isOwn = m.user_id === profile.id;
              const isTransferIncome = m.type === 'income' && m.description.startsWith('Transferencia de');
              const isHomeExpense = m.type === 'expense' && m.category === 'Hogar';
              if (isOwn) {
                if (m.type === 'transfer_to_joint') displayDesc = 'Transferiste';
                else if (isTransferIncome) displayDesc = 'Transferiste';
                else if (m.type === 'income') displayDesc = 'Ingresaste dinero';
                else if (isHomeExpense) displayDesc = m.description;
                else if (m.type === 'expense') displayDesc = 'Hiciste un gasto';
              } else if (partnerAlias) {
                if (m.type === 'transfer_to_joint') displayDesc = `${partnerAlias} ha transferido`;
                else if (isTransferIncome) displayDesc = `${partnerAlias} ha transferido`;
                else if (m.type === 'income') displayDesc = `${partnerAlias} ingresó dinero`;
                else if (isHomeExpense) displayDesc = `${partnerAlias}: ${m.description}`;
                else if (m.type === 'expense') displayDesc = `${partnerAlias} realizó un gasto`;
                else displayDesc = `${partnerAlias}: ${m.description}`;
              }
            }
            return (
              <motion.div
                key={m.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setDetailMovement(m)}
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer hover:border-[var(--theme-primary)] dark:hover:border-[var(--theme-primary)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    isPos ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]'
                  } ${m.type === 'transfer_to_joint' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : ''}`}>
                    {ctx.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayDesc}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{m.category}</span>
                      <span>·</span>
                      <span>{formatDateShort(m.date)}</span>
                      {m.is_couple && <><span>·</span><span className="text-[var(--theme-primary)]">compartido</span></>}
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ml-3 ${
                  isPos ? 'text-[var(--theme-primary)]' : m.type === 'transfer_to_joint' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-secondary)]'
                }`}>
                  {isPos ? '+' : '-'}{formatCurrency(m.amount)}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      <AddMovementModal open={modalOpen} onClose={() => { setModalOpen(false); loadData(); }} isCouple={isCouple} />

      {/* Movement detail modal */}
      {detailMovement && createPortal(
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeDetailMovement} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                  detailMovement.type === 'income' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' :
                  detailMovement.type === 'transfer_to_joint' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' :
                  'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]'
                }`}>
                  {detailMovement.type === 'income' ? '+' : detailMovement.type === 'transfer_to_joint' ? '↗' : '−'}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {(() => {
                      if (!profile) return detailMovement.description;
                      const isOwn = detailMovement.user_id === profile.id;
                      const isTransferIncome = detailMovement.type === 'income' && detailMovement.description.startsWith('Transferencia de');
                      const isHomeExpense = detailMovement.type === 'expense' && detailMovement.category === 'Hogar';
                      if (isOwn) {
                        if (detailMovement.type === 'transfer_to_joint' || isTransferIncome) return 'Transferiste';
                        if (detailMovement.type === 'income') return 'Ingresaste dinero';
                        if (isHomeExpense) return detailMovement.description;
                        if (detailMovement.type === 'expense') return 'Hiciste un gasto';
                        return detailMovement.description;
                      }
                      if (!partnerAlias) return detailMovement.description;
                      if (detailMovement.type === 'transfer_to_joint' || isTransferIncome) return `${partnerAlias} ha transferido`;
                      if (detailMovement.type === 'income') return `${partnerAlias} ingresó dinero`;
                      if (isHomeExpense) return `${partnerAlias}: ${detailMovement.description}`;
                      if (detailMovement.type === 'expense') return `${partnerAlias} realizó un gasto`;
                      return `${partnerAlias}: ${detailMovement.description}`;
                    })()}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{typeLabels[detailMovement.type]?.label || detailMovement.type}</p>
                </div>
              </div>
              <button
                onClick={closeDetailMovement}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Monto</span>
                <span className={`text-xl font-bold ${
                  detailMovement.type === 'income' ? 'text-[var(--theme-primary)]' :
                  detailMovement.type === 'transfer_to_joint' ? 'text-[var(--theme-primary)]' :
                  'text-[var(--theme-secondary)]'
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
                  {new Date(detailMovement.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {detailMovement.is_couple ? 'Compartido' : 'Personal'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </motion.div>
  );
}
