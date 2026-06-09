import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Home,
  Target,
  BarChart3,
  Users,
  Settings,
  Church,
  X,
} from 'lucide-react';
import { useCoupleStore, useUIStore } from '../../store';

const personalLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/debts', icon: Wallet, label: 'Deudas' },
  { to: '/savings', icon: PiggyBank, label: 'Ahorros' },
  { to: '/tithes', icon: Church, label: 'Diezmo' },
  { to: '/home', icon: Home, label: 'Hogar' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

const coupleLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/couple', icon: Users, label: 'Pareja' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/debts', icon: Wallet, label: 'Deudas' },
  { to: '/savings', icon: PiggyBank, label: 'Ahorros' },
  { to: '/tithes', icon: Church, label: 'Diezmo' },
  { to: '/home', icon: Home, label: 'Hogar' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { viewMode } = useCoupleStore();
  const { sidebarOpen, closeSidebar } = useUIStore();
  const links = viewMode === 'couple' ? coupleLinks : personalLinks;
  const bottomLinks = links.filter((link) =>
    ['Inicio', 'Movimientos', 'Ahorros', 'Hogar', 'Ajustes'].includes(link.label),
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-black/[0.04] dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-8 h-8" />
          <span className="text-xl font-black text-gray-950 dark:text-white">
            Vasija
          </span>
        </div>
        <button
          onClick={closeSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-white" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => { if (window.innerWidth < 768) closeSidebar(); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                active
                  ? 'bg-white text-[var(--theme-primary)] shadow-sm ring-1 ring-black/[0.04] dark:bg-white/10 dark:text-white dark:ring-white/10'
                  : 'text-gray-500 hover:bg-white/70 hover:text-gray-950 dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-black/[0.04] dark:border-white/10">
        <p className="text-xs text-gray-400">Vasija v1.0.0</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-[color-mix(in_srgb,var(--app-surface)_78%,white_22%)] dark:bg-[var(--theme-card-bg)] border-r border-black/[0.04] dark:border-white/10 fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={closeSidebar}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[var(--app-surface)] dark:bg-gray-900 shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[28px] border border-white/70 bg-white/88 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-[var(--theme-card-bg)]/88 md:hidden">
        {bottomLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-3xl text-[10px] font-black transition ${
                active
                  ? 'bg-[var(--theme-primary)] text-white shadow-[0_10px_22px_color-mix(in_srgb,var(--theme-primary)_24%,transparent)]'
                  : 'text-gray-400 active:scale-95 dark:text-white/45'
              }`}
              aria-label={link.label}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate px-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
