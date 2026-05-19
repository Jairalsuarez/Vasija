import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Moon, Sun, Monitor, LogOut, Church, Users } from 'lucide-react';
import { useProfileStore, useUIStore } from '../store';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const { profile, logout, updateProfile } = useProfileStore();
  const { theme, setTheme, autoTithe, setAutoTithe } = useUIStore();
  const [notifications, setNotifications] = useState(true);

  const [aliasInput, setAliasInput] = useState(profile?.couple_alias || '');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState('');

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAliasInput(val);
    
    if (val.length > 8) {
      setAliasError('No más de 8 caracteres.');
      return;
    }

    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      setAliasError('Máximo 2 palabras.');
      return;
    }

    setAliasError('');
  };

  const saveAlias = async () => {
    if (!profile) return;
    setAliasSaving(true);
    setAliasError('');
    
    const words = aliasInput.trim().split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      setAliasError('Máximo 2 palabras.');
      setAliasSaving(false);
      return;
    }
    if (aliasInput.length > 8) {
      setAliasError('No más de 8 caracteres.');
      setAliasSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ couple_alias: aliasInput.trim() || null })
      .eq('id', profile.id);

    if (updateError) {
      setAliasError(updateError.message);
    } else {
      updateProfile({ couple_alias: aliasInput.trim() || null });
    }
    setAliasSaving(false);
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Claro' },
    { value: 'dark' as const, icon: Moon, label: 'Oscuro' },
    { value: 'system' as const, icon: Monitor, label: 'Sistema' },
  ];

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
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {profile?.name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{profile?.name}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4" /> Tema
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
                        ? 'bg-blue-600 text-white'
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
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" /> Pareja
              </h4>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                  Nombrarte en la pareja (Alias)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej. amor, osito..."
                    value={aliasInput}
                    onChange={handleAliasChange}
                    maxLength={8}
                    className="flex-1"
                  />
                  <Button
                    onClick={saveAlias}
                    loading={aliasSaving}
                    disabled={aliasInput === (profile.couple_alias || '') || aliasError !== ''}
                    size="sm"
                  >
                    Guardar
                  </Button>
                </div>
                {aliasError && (
                  <p className="text-[11px] text-red-500 font-medium">{aliasError}</p>
                )}
                <p className="text-[10px] text-gray-400 block">
                  Máximo 2 palabras y 8 caracteres en total.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button variant="danger" onClick={logout} className="w-full">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </Button>
    </motion.div>
  );
}
