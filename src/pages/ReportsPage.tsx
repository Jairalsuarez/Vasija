import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileSpreadsheet, Search, TrendingUp, TrendingDown, Home, Utensils,
  Zap, Droplets, Wifi, Phone, ShieldCheck, Wrench, Sparkles, Sofa, Shirt,
  HeartPulse, Car, GraduationCap, Baby, PawPrint, Plane, Dumbbell, Church,
  ArrowLeftRight, DollarSign, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useFinanceStore } from '../store';
import { formatCurrency } from '../lib/formatters';
import { useExport } from '../hooks/useExport';
import { Button } from '../components/ui/Button';

type Period = 'day' | 'week' | 'month' | 'all';

function getCategoryMeta(category: string, type: 'income' | 'expense' | string) {
  const c = category.toLowerCase();
  if (type === 'income') return { Icon: TrendingUp, bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' };
  if (c.includes('arriendo') || c.includes('hipoteca') || c.includes('casa')) {
    return { Icon: Home, bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' };
  }
  if (c.includes('comida') || c.includes('restaurante') || c.includes('super')) {
    return { Icon: Utensils, bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' };
  }
  if (c.includes('luz') || c.includes('electricidad')) return { Icon: Zap, bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308' };
  if (c.includes('agua')) return { Icon: Droplets, bg: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' };
  if (c.includes('internet')) return { Icon: Wifi, bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' };
  if (c.includes('telefono') || c.includes('celular')) return { Icon: Phone, bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' };
  if (c.includes('seguro')) return { Icon: ShieldCheck, bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
  if (c.includes('mantenimiento') || c.includes('reparacion')) return { Icon: Wrench, bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b' };
  if (c.includes('limpieza')) return { Icon: Sparkles, bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' };
  if (c.includes('mueble') || c.includes('sofa')) return { Icon: Sofa, bg: 'rgba(20, 184, 166, 0.12)', color: '#20b8a6' };
  if (c.includes('ropa') || c.includes('vestido')) return { Icon: Shirt, bg: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' };
  if (c.includes('salud') || c.includes('medicina') || c.includes('doctor')) return { Icon: HeartPulse, bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' };
  if (c.includes('transporte') || c.includes('carro') || c.includes('bus') || c.includes('gasolina')) {
    return { Icon: Car, bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' };
  }
  if (c.includes('educacion') || c.includes('universidad') || c.includes('curso')) {
    return { Icon: GraduationCap, bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' };
  }
  if (c.includes('hijo') || c.includes('bebe')) return { Icon: Baby, bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' };
  if (c.includes('mascota') || c.includes('perro') || c.includes('gato')) return { Icon: PawPrint, bg: 'rgba(120, 113, 108, 0.12)', color: '#78716c' };
  if (c.includes('viaje') || c.includes('avion')) return { Icon: Plane, bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' };
  if (c.includes('bienestar') || c.includes('gimnasio') || c.includes('deporte')) {
    return { Icon: Dumbbell, bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
  }
  if (c.includes('diezmo') || c.includes('iglesia') || c.includes('ofrenda')) {
    return { Icon: Church, bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' };
  }
  if (c.includes('transferencia')) return { Icon: ArrowLeftRight, bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' };

  return { Icon: DollarSign, bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' };
}

const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

export function ReportsPage() {
  const { movements } = useFinanceStore();
  const { exportPDF, exportExcel } = useExport();
  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return movements.filter((m) => {
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
  }, [movements, period, search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter((m) => m.type === 'expense').forEach((m) => {
      map.set(m.category, (map.get(m.category) || 0) + m.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filtered.forEach((m) => {
      const month = m.date.substring(0, 7); // YYYY-MM
      const current = map.get(month) || { income: 0, expense: 0 };
      if (m.type === 'income') current.income += m.amount;
      else current.expense += m.amount;
      map.set(month, current);
    });
    return Array.from(map.entries()).map(([month, data]) => ({
      month,
      Ingresos: data.income,
      Gastos: data.expense,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  // Revolut daily balance trend curve reconstruction
  const balanceTrendData = useMemo(() => {
    if (filtered.length === 0) return [];
    
    // Sort chronologically ascending
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    
    let currentSum = 0;
    const dailyMap = new Map<string, number>();
    
    sorted.forEach((m) => {
      const change = m.type === 'income' ? m.amount : -m.amount;
      currentSum += change;
      dailyMap.set(m.date, currentSum);
    });
    
    const dates = Array.from(dailyMap.keys()).sort();
    return dates.map((date) => ({
      fecha: new Date(date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }),
      Saldo: dailyMap.get(date) || 0,
      rawDate: date,
    }));
  }, [filtered]);

  const incomeTotal = filtered.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const expenseTotal = filtered.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const netSavings = incomeTotal - expenseTotal;

  // Max peak balance
  const peakBalance = useMemo(() => {
    if (balanceTrendData.length === 0) return 0;
    return Math.max(...balanceTrendData.map((d) => d.Saldo));
  }, [balanceTrendData]);

  // Average balance
  const avgBalance = useMemo(() => {
    if (balanceTrendData.length === 0) return 0;
    const sum = balanceTrendData.reduce((s, d) => s + d.Saldo, 0);
    return sum / balanceTrendData.length;
  }, [balanceTrendData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 relative"
    >
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight">Análisis y Reportes</h2>
          <p className="text-xs text-gray-400 mt-1">Monitorea tus ingresos, gastos y tendencias de flujo de caja.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportPDF(period === 'all' ? 'month' : period)} className="rounded-2xl px-4 py-2 hover:scale-[1.02] shadow-sm">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={exportExcel} className="rounded-2xl px-4 py-2 hover:scale-[1.02] shadow-sm">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Modern Sliding Tabs (Period Selector) */}
      <div className="relative flex p-1.5 bg-gray-200/50 dark:bg-white/[0.04] rounded-2xl max-w-sm border border-black/[0.02] dark:border-white/[0.02]">
        {([
          { key: 'day', label: 'Hoy' },
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mes' },
          { key: 'all', label: 'Todo' }
        ] as { key: Period; label: string }[]).map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="relative flex-1 py-2 text-xs font-black transition-colors rounded-xl focus:outline-none z-10"
              style={{ color: active ? 'var(--theme-primary, #3b82f6)' : 'var(--theme-text-secondary, #64748b)' }}
            >
              <span className="relative z-10">{p.label}</span>
              {active && (
                <motion.div
                  layoutId="activePeriodTab"
                  className="absolute inset-0 bg-white dark:bg-[var(--theme-card-bg)] rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.06)] z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-card p-5 relative overflow-hidden">
          <div className="absolute right-4 top-4 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ingresos Totales</p>
          <h3 className="text-2xl font-black text-green-600 mt-2">+{formatCurrency(incomeTotal)}</h3>
          <p className="text-[10px] text-gray-400 mt-2">En el período seleccionado</p>
        </div>

        <div className="premium-card p-5 relative overflow-hidden">
          <div className="absolute right-4 top-4 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
            <TrendingDown className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gastos Totales</p>
          <h3 className="text-2xl font-black text-red-500 mt-2">-{formatCurrency(expenseTotal)}</h3>
          <p className="text-[10px] text-gray-400 mt-2">En el período seleccionado</p>
        </div>

        <div className="premium-card p-5 relative overflow-hidden">
          <div className={`absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center ${netSavings >= 0 ? 'bg-blue-500/10 text-[var(--theme-primary)]' : 'bg-rose-500/10 text-[var(--theme-secondary)]'}`}>
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Flujo de Caja Neto</p>
          <h3 className={`text-2xl font-black mt-2 ${netSavings >= 0 ? 'text-[var(--theme-primary, #3b82f6)]' : 'text-[var(--theme-secondary, #ec4899)]'}`}>
            {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
          </h3>
          <p className="text-[10px] text-gray-400 mt-2">Tasa de ahorro: {incomeTotal > 0 ? `${Math.round((netSavings / incomeTotal) * 100)}%` : '0%'}</p>
        </div>
      </div>

      {/* Main Revolut Balance Trend Chart */}
      {balanceTrendData.length > 0 && (
        <div className="premium-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">Tendencia de Balance</h3>
              <p className="text-xs text-gray-400">Progreso del saldo neto en el tiempo</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Pico: <strong className="text-gray-950 dark:text-white">{formatCurrency(peakBalance)}</strong></span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
              <span>Promedio: <strong className="text-gray-950 dark:text-white">{formatCurrency(avgBalance)}</strong></span>
            </div>
          </div>
          <div className="w-full" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--theme-primary, #3B82F6)" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="var(--theme-primary, #3B82F6)" stopOpacity={0.00}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--theme-text-secondary, #94a3b8)', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--theme-text-secondary, #94a3b8)', fontWeight: 600 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  cursor={{ stroke: 'var(--theme-primary, #3B82F6)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Saldo Neto']}
                  labelStyle={{ fontWeight: 800, color: 'var(--theme-text-primary, #0f172a)' }}
                />
                <Area type="monotone" dataKey="Saldo" stroke="var(--theme-primary, #3B82F6)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income vs Expenses rounded bar chart */}
      {byMonth.length > 0 && (
        <div className="premium-card p-5 sm:p-6">
          <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider mb-5">Ingresos vs Gastos por Mes</h3>
          <div className="w-full" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--theme-text-secondary, #94a3b8)', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--theme-text-secondary, #94a3b8)', fontWeight: 600 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="Ingresos" fill="var(--theme-primary, #10B981)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Gastos" fill="var(--theme-secondary, #EF4444)" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Expenses Donut Chart with center overlay & legend */}
      {byCategory.length > 0 && (
        <div className="premium-card p-5 sm:p-6">
          <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider mb-6">Gastos por Categoría</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Center Donut */}
            <div className="relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Gastos Totales</span>
                <span className="text-xl font-black text-gray-950 dark:text-white mt-1 leading-none">
                  {formatCurrency(expenseTotal)}
                </span>
              </div>
            </div>

            {/* Custom Interactive Legend List */}
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {byCategory.map((cat, i) => {
                const percent = Math.round((cat.value / expenseTotal) * 100);
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                const meta = getCategoryMeta(cat.name, 'expense');
                const Icon = meta.Icon;

                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-gray-950 dark:text-white truncate">{cat.name}</span>
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{percent}% ({formatCurrency(cat.value)})</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transaction History list card */}
      <div className="premium-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">Historial del Período</h3>
          {/* Custom Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-gray-300 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="Buscar por descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-400 py-10 text-xs font-bold"
              >
                No se encontraron movimientos registrados.
              </motion.p>
            ) : (
              filtered.map((m) => {
                const meta = getCategoryMeta(m.category, m.type);
                const Icon = meta.Icon;

                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] bg-white/40 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg, color: meta.color }}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-bold text-gray-950 dark:text-white truncate">{m.description}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">{m.category} · {m.date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${m.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
