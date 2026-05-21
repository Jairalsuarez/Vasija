import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Palette,
  Save,
  Send,
  Check,
  X,
  User,
  Users,
  Clock3,
} from 'lucide-react';
import { useProfileStore, useCoupleStore } from '../store';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { getBalance } from '../services/movementService';
import { getJointAccount } from '../services/jointAccountService';
import { proposeNameChange, respondNameChange, getPendingNameChange } from '../services/nameChangeService';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatCurrency } from '../lib/formatters';
import type { Gender } from '../types';

type AccountMode = 'personal' | 'joint';
type Editor = 'name' | 'color' | null;

const personalThemeOptions: Array<{ gender: Gender; label: string; color: string; app_theme: string }> = [
  { gender: 'male', label: 'Azul', color: '#0b59b3', app_theme: 'male-blue' },
  { gender: 'female', label: 'Rosa', color: '#e35695', app_theme: 'female-rose' },
  { gender: 'unspecified', label: 'Gris', color: '#334155', app_theme: 'neutral' },
];

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, updateProfile } = useProfileStore();
  const { isLinked, partnerName, partnerAlias, viewMode, setViewMode } = useCoupleStore();
  const appTheme = useAppTheme();

  const requestedMode = searchParams.get('type') as AccountMode | null;
  const activeMode: AccountMode = viewMode === 'couple' && isLinked ? 'joint' : 'personal';
  const focus = searchParams.get('focus');
  const [activeEditor, setActiveEditor] = useState<Editor>(focus === 'name-request' ? 'name' : null);

  const [accountName, setAccountName] = useState(profile?.account_name || profile?.name || '');
  const [personalBalance, setPersonalBalance] = useState(0);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [jointAcc, setJointAcc] = useState<{ id: string; balance: number; name: string; theme: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{
    id: string;
    requester_id: string;
    proposed_name: string;
    created_at: string;
  } | null>(null);
  const [newJointName, setNewJointName] = useState('');
  const [savingJoint, setSavingJoint] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const myId = profile?.id;
  const isMyRequest = pendingRequest?.requester_id === myId;
  const nameWaiting = activeMode === 'joint' && !!pendingRequest && isMyRequest;
  const partnerLabel = partnerAlias || partnerName || 'Pareja';

  const accountView = useMemo(() => {
    if (activeMode === 'joint' && jointAcc) {
      const liveJointName =
        activeEditor === 'name' && !pendingRequest && newJointName.trim()
          ? newJointName
          : pendingRequest
            ? pendingRequest.proposed_name
            : jointAcc.name;

      return {
        icon: Users,
        kicker: `${profile?.name || 'Tu'} y ${partnerLabel}`,
        name: liveJointName,
        balance: jointAcc.balance,
        cardClass: 'text-white',
        cardStyle: { background: `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})` },
        accentClass: 'bg-white/15',
      };
    }

    return {
      icon: User,
      kicker: profile?.email || 'Cuenta personal',
      name: accountName || profile?.name || 'Mi cuenta',
      balance: personalBalance,
      cardClass: 'text-white',
      cardStyle: { background: `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})` },
      accentClass: 'bg-white/15',
    };
  }, [activeEditor, activeMode, accountName, appTheme.primary, appTheme.secondary, isMyRequest, jointAcc, newJointName, partnerLabel, pendingRequest, personalBalance, profile]);

  const loadJoint = async () => {
    if (!profile || !isLinked) return;
    const acc = await getJointAccount(profile.id);
    if (!acc?.id) return;
    setJointAcc({
      id: acc.id,
      balance: acc.balance,
      name: acc.account_name || 'Nuestra cuenta',
      theme: acc.theme || 'purple',
    });
    const pending = await getPendingNameChange(acc.id);
    setPendingRequest(
      pending
        ? {
            id: pending.id,
            requester_id: pending.requester_id,
            proposed_name: pending.proposed_name,
            created_at: pending.created_at,
          }
        : null,
    );
  };

  useEffect(() => {
    setAccountName(profile?.account_name || profile?.name || '');
  }, [profile?.account_name, profile?.name]);

  useEffect(() => {
    if (!profile?.id) return;
    void getBalance(profile.id).then(setPersonalBalance);
  }, [profile?.id]);

  useEffect(() => {
    void loadJoint();
  }, [profile?.id, isLinked]);

  useEffect(() => {
    if (requestedMode === 'joint' && isLinked) setViewMode('couple');
    if (requestedMode === 'personal') setViewMode('personal');
  }, [requestedMode, isLinked, setViewMode]);

  useEffect(() => {
    if (focus === 'name-request') setActiveEditor('name');
  }, [focus]);

  const savePersonalName = async () => {
    if (!profile || !accountName.trim()) return;
    setSavingPersonal(true);
    setError('');
    setSuccess('');
    const cleanName = accountName.trim();
    const { error: err } = await supabase.from('profiles').update({ account_name: cleanName }).eq('id', profile.id);
    if (!err) {
      updateProfile({ account_name: cleanName });
      setSuccess('Nombre actualizado.');
    } else {
      setError(err.message);
    }
    setSavingPersonal(false);
  };

  const savePersonalTheme = async (gender: Gender, appThemeId: string) => {
    if (!profile) return;
    setSavingTheme(true);
    const { error: err } = await supabase.from('profiles').update({ gender, app_theme: appThemeId }).eq('id', profile.id);
    if (!err) updateProfile({ gender, app_theme: appThemeId });
    setSavingTheme(false);
  };

  const handlePropose = async () => {
    if (!jointAcc || !newJointName.trim()) return;
    setSavingJoint(true);
    setError('');
    setSuccess('');
    const result = await proposeNameChange(jointAcc.id, newJointName.trim());
    if (result.success) {
      setSuccess('Solicitud enviada.');
      setNewJointName('');
      await loadJoint();
    } else {
      setError(result.error || 'No se pudo enviar la solicitud.');
    }
    setSavingJoint(false);
  };

  const handleRespond = async (accept: boolean) => {
    if (!pendingRequest) return;
    setSavingJoint(true);
    setError('');
    setSuccess('');
    const result = await respondNameChange(pendingRequest.id, accept);
    if (result.success) {
      setActiveEditor(null);
      await loadJoint();
    } else {
      setError(result.error || 'No se pudo responder.');
    }
    setSavingJoint(false);
  };

  const openNameEditor = () => {
    if (activeEditor === 'name') {
      setActiveEditor(null);
      return;
    }
    if (activeMode === 'joint' && jointAcc && !pendingRequest) setNewJointName(jointAcc.name);
    setActiveEditor('name');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-lg space-y-5"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-black text-gray-950 dark:text-white">Configuracion de cuentas</h2>
      </div>

      <section
        className={`relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-gray-900/10 ${accountView.cardClass}`}
        style={accountView.cardStyle}
      >
        <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${accountView.accentClass}`} />
        <div className={`absolute -bottom-10 -left-8 h-24 w-24 rounded-full ${accountView.accentClass}`} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2 text-white/90">
              <accountView.icon className="h-5 w-5" />
              <span className="truncate text-xs font-bold">{accountView.kicker}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {pendingRequest && !isMyRequest ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-2xl font-black">{accountView.name}</h3>
                  <button
                    type="button"
                    onClick={() => handleRespond(false)}
                    disabled={savingJoint}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95 disabled:opacity-50"
                    aria-label="Rechazar nombre"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(true)}
                    disabled={savingJoint}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-950 transition-all active:scale-95 disabled:opacity-50"
                    aria-label="Aceptar nombre"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : activeEditor === 'name' && (activeMode === 'personal' || !pendingRequest) ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={activeMode === 'personal' ? accountName : newJointName}
                    onChange={(e) => (activeMode === 'personal' ? setAccountName(e.target.value) : setNewJointName(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (activeMode === 'personal') void savePersonalName();
                        else void handlePropose();
                      }
                    }}
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-xl font-black text-white outline-none placeholder:text-white/60 focus:border-white/60"
                  />
                  <button
                    type="button"
                    onClick={activeMode === 'personal' ? savePersonalName : handlePropose}
                    disabled={
                      activeMode === 'personal'
                        ? !accountName.trim() || savingPersonal
                        : !newJointName.trim() || savingJoint || newJointName.trim() === jointAcc?.name
                    }
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-950 transition-all active:scale-95 disabled:opacity-50"
                    aria-label="Guardar nombre"
                  >
                    {activeMode === 'personal' ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              ) : (
                <h3 className="truncate text-2xl font-black">{accountView.name}</h3>
              )}
              {pendingRequest && !isMyRequest ? null : nameWaiting ? (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15" aria-label="Esperando respuesta">
                  <Clock3 className="h-4 w-4 animate-pulse" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={openNameEditor}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                  aria-label="Editar nombre"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-4 text-3xl font-black">{formatCurrency(Number(accountView.balance || 0))}</p>
          </div>
          <div className="flex flex-col gap-2">
            {pendingRequest && !isMyRequest ? null : nameWaiting ? (
              <button
                type="button"
                onClick={() => setActiveEditor(activeEditor === 'name' ? null : 'name')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                aria-label="Ver solicitud pendiente"
              >
                <Clock3 className="h-4 w-4 animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openNameEditor}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                aria-label="Editar nombre"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            {activeMode === 'personal' && (
              <button
                type="button"
                onClick={() => setActiveEditor(activeEditor === 'color' ? null : 'color')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                aria-label="Editar color"
              >
                <Palette className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {activeEditor === 'color' && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          {personalThemeOptions.map((option) => {
                const active = profile?.gender === option.gender;
                return (
                  <button
                    key={option.gender}
                    type="button"
                    disabled={savingTheme}
                    onClick={() => savePersonalTheme(option.gender, option.app_theme)}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-full border transition-all ${
                      active ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)]' : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                    }`}
                    aria-label={option.label}
                  >
                    <span className="block h-7 w-7 rounded-full" style={{ backgroundColor: option.color }} />
                  </button>
                );
              })}
        </div>
      )}

      {(error || success) && (
        <div
          className={`rounded-2xl border p-3 text-sm font-bold ${
            error
              ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-950 dark:bg-red-950/25 dark:text-red-300'
              : 'border-green-100 bg-green-50 text-green-700 dark:border-green-950 dark:bg-green-950/25 dark:text-green-300'
          }`}
        >
          {error || success}
        </div>
      )}

      {viewMode === 'couple' && !isLinked && (
        <section className="rounded-3xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Primero conecta con tu pareja.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/couple')}>
            Conectar
          </Button>
        </section>
      )}
    </motion.div>
  );
}
