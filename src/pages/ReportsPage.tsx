import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, Search } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useFinanceStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { useExport } from '../hooks/useExport';
import { Button } from '../components/ui/Button';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

type Period = 'day' | 'week' | 'month' | 'all';

export function ReportsPage() {
  const { movements } = useFinanceStore();
  const { exportPDF, exportExcel } = useExport();
  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch = m.description.toLowerCase().includes(search.toLowerCase());
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
  }, [movements, period, search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter((m) => m.type === 'expense').forEach((m) => {
      map.set(m.category, (map.get(m.category) || 0) + m.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filtered.forEach((m) => {
      const month = m.date.substring(0, 7);
      const current = map.get(month) || { income: 0, expense: 0 };
      if (m.type === 'income') current.income += m.amount;
      else current.expense += m.amount;
      map.set(month, current);
    });
    return Array.from(map.entries()).map(([month, data]) => ({
      month,
      Ingresos: data.income,
      Gastos: data.expense,
    }));
  }, [filtered]);

  const incomeTotal = filtered.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const expenseTotal = filtered.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reportes</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportPDF(period === 'all' ? 'month' : period)}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['day', 'week', 'month', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-xl font-bold text-green-600">+{formatCurrency(incomeTotal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Gastos</p>
          <p className="text-xl font-bold text-red-600">-{formatCurrency(expenseTotal)}</p>
        </div>
      </div>

      {byMonth.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ingresos vs Gastos</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {byCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gastos por categoría</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name }) => name}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Historial</h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar en historial..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>
          ) : (
            filtered.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.description}</p>
                  <p className="text-xs text-gray-400">{m.category} · {m.date}</p>
                </div>
                <p className={`text-sm font-semibold ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
