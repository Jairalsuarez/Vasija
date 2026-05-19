import { Menu, Sun, Moon, User, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfileStore, useUIStore, useCoupleStore } from '../../store';
import { Switch } from '../ui/Switch';
import { UserMenu } from './UserMenu';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/movements': 'Movimientos',
  '/debts': 'Deudas',
  '/goals': 'Metas',
  '/reports': 'Reportes',
  '/couple': 'Pareja',
  '/settings': 'Ajustes',
  '/profile': 'Perfil',
  '/about': 'Acerca de',
};

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useProfileStore();
  const { theme, setTheme, toggleSidebar, toggleUserMenu } = useUIStore();
  const { viewMode, toggleViewMode, isLinked } = useCoupleStore();

  const effectiveTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const ThemeIcon = effectiveTheme === 'dark' ? Moon : Sun;

  const cycleTheme = () => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const handleViewToggle = () => {
    if (!isLinked && viewMode === 'personal') {
      navigate('/couple');
      return;
    }
    toggleViewMode();
  };

  const pageTitle = pageTitles[pathname] || '';

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white md:hidden line-clamp-1">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={viewMode === 'couple'}
              onChange={handleViewToggle}
              iconUnchecked={User}
              iconChecked={Users}
            />
          </div>

          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          >
            <ThemeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={toggleUserMenu}
            className="active:scale-95 transition-transform"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-pink-600 flex items-center justify-center text-white font-semibold text-sm">
                {profile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </button>
        </div>
      </div>
      <UserMenu />
    </header>
  );
}
