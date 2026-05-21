import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Moon, Sun, Monitor, LogOut, Church, Edit3 } from 'lucide-react';
import { useProfileStore, useUIStore, useCoupleStore, useFinanceStore } from '../store';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { signOut } from '../services/authService';
import type { Gender } from '../types';

export function SettingsPage() {
  const { profile, logout, updateProfile } = useProfileStore();
  const { resetCouple } = useCoupleStore();
  const { resetFinance } = useFinanceStore();
  const { theme, setTheme, autoTithe, setAutoTithe } = useUIStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [accountNameInput, setAccountNameInput] = useState(profile?.account_name || profile?.name || '');
  const [accountNameSaving, setAccountNameSaving] = useState(false);
  const [accountNameError, setAccountNameError] = useState('');
  const [genderSaving, setGenderSaving] = useState(false);

  const genderOptions: Array<{ value: Gender; label: string }> = [
    { value: 'male', label: 'Hombre' },
    { value: 'female', label: 'Mujer' },
    { value: 'unspecified', label: 'Prefiero no decirlo' },
  ];

  const saveGender = async (gender: Gender) => {
    if (!profile) return;
    setGenderSaving(true);
    const app_theme = gender === 'male' ? 'male-blue' : gender === 'female' ? 'female-rose' : 'neutral';
    const { error } = await supabase
      .from('profiles')
      .update({ gender, app_theme })
      .eq('id', profile.id);

    if (!error) updateProfile({ gender, app_theme });
    setGenderSaving(false);
  };

  const saveAccountName = async () => {
    if (!profile) return;
    setAccountNameSaving(true);
    setAccountNameError('');

    if (!accountNameInput.trim()) {
      setAccountNameError('El nombre no puede estar vacío');
      setAccountNameSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_name: accountNameInput.trim() })
      .eq('id', profile.id);

    if (updateError) {
      setAccountNameError(updateError.message);
    } else {
      updateProfile({ account_name: accountNameInput.trim() });
    }
    setAccountNameSaving(false);
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Claro' },
    { value: 'dark' as const, icon: Moon, label: 'Oscuro' },
    { value: 'system' as const, icon: Monitor, label: 'Sistema' },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    resetCouple();
    resetFinance();
    logout();
    navigate('/', { replace: true });
    const { error } = await signOut();
    if (error) console.warn('Supabase sign out failed:', error);
    setLoggingOut(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-lg"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración</h2>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {profile?.name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{profile?.name}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Personal account name */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Nombre de tu cuenta personal
            </h4>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: Mi cuenta"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={saveAccountName}
                loading={accountNameSaving}
                disabled={accountNameInput === (profile?.account_name || profile?.name || '') || !accountNameInput.trim()}
                size="sm"
              >
                Guardar
              </Button>
            </div>
            {accountNameError && (
              <p className="text-[11px] text-red-500 font-medium">{accountNameError}</p>
            )}
          </div>



          {/* Theme (light/dark) */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              Probar tema por sexo
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {genderOptions.map((opt) => {
                const active = profile?.gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => saveGender(opt.value)}
                    disabled={genderSaving}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      active
                        ? 'bg-[var(--theme-primary)] text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4" /> Modo
            </h4>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[var(--theme-primary)] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificaciones
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Recordatorios y notificaciones</span>
              <Switch checked={notifications} onChange={setNotifications} />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Church className="w-4 h-4" /> Iglesia
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block font-medium">Diezmo Automático (10%)</span>
              </div>
              <Switch checked={autoTithe} onChange={setAutoTithe} />
            </div>
          </div>

          {profile?.partner_id && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 text-center">
                Configura el alias de tu pareja en la sección <strong>Pareja</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      <Button variant="danger" onClick={handleLogout} loading={loggingOut} className="w-full">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </Button>
    </motion.div>
  );
}
