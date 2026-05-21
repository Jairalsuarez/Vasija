import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Info,
  LogOut,
} from 'lucide-react';
import { signOut } from '../../services/authService';
import { useProfileStore, useUIStore, useCoupleStore } from '../../store';

export function UserMenu() {
  const { userMenuOpen, closeUserMenu } = useUIStore();
  const { profile, logout } = useProfileStore();
  const { resetCouple } = useCoupleStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    closeUserMenu();
    resetCouple();
    logout();
    navigate('/', { replace: true });
    const { error } = await signOut();
    if (error) console.warn('Supabase sign out failed:', error);
  };

  const items = [
    { icon: User, label: 'Perfil', onClick: () => { navigate('/profile'); closeUserMenu(); } },
    { icon: Settings, label: 'Configuración', onClick: () => { navigate('/settings'); closeUserMenu(); } },
    { icon: Info, label: 'Acerca de', onClick: () => { navigate('/about'); closeUserMenu(); } },
  ];

  return (
    <AnimatePresence>
      {userMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeUserMenu}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-4 top-16 z-50 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {profile?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {profile?.email}
              </p>
            </div>
            <div className="p-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="p-1 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
