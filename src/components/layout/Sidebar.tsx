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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-8 h-8" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
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
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => { if (window.innerWidth < 768) closeSidebar(); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] dark:bg-[var(--theme-primary-light)] dark:text-white'
                  : 'text-gray-600 hover:bg-[var(--theme-hover)] dark:text-white/85 dark:hover:bg-[var(--theme-primary-light)] dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400">Vasija v1.0.0</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 z-30">
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
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-gray-900 shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
