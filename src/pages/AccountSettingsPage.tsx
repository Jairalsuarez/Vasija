import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useProfileStore, useCoupleStore, useFinanceStore } from '../store';
import { Button } from '../components/ui/Button';
import { MinimalActionToast } from '../components/ui/MinimalActionToast';
import { supabase } from '../lib/supabase';
import { getBalance } from '../services/movementService';
import { getJointAccount, updateJointAccountTheme } from '../services/jointAccountService';
import { proposeNameChange, respondNameChange, getPendingNameChange } from '../services/nameChangeService';
import { useAppTheme } from '../hooks/useAppTheme';
import { getThemeColor, JOINT_ACCOUNT_THEMES } from '../config/themes';
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
  const {
    balance: cachedPersonalBalance,
    jointBalance: cachedJointBalance,
    jointAccountId,
    jointAccountName,
    jointAccountTheme,
    setJointAccountMeta,
    setJointBalance,
  } = useFinanceStore();
  const appTheme = useAppTheme();

  const requestedMode = searchParams.get('type') as AccountMode | null;
  const activeMode: AccountMode = viewMode === 'couple' && isLinked ? 'joint' : 'personal';
  const focus = searchParams.get('focus');
  const [activeEditor, setActiveEditor] = useState<Editor>(focus === 'name-request' ? 'name' : null);

  const [accountName, setAccountName] = useState(profile?.account_name || profile?.name || '');
  const [personalBalance, setPersonalBalance] = useState(cachedPersonalBalance);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [jointAcc, setJointAcc] = useState<{ id: string; balance: number; name: string; theme: string } | null>(
    jointAccountId
      ? {
          id: jointAccountId,
          balance: cachedJointBalance,
          name: jointAccountName,
          theme: jointAccountTheme,
        }
      : null,
  );
  const [pendingRequest, setPendingRequest] = useState<{
    id: string;
    requester_id: string;
    proposed_name: string;
    created_at: string;
  } | null>(null);
  const [newJointName, setNewJointName] = useState('');
  const [savingJoint, setSavingJoint] = useState(false);
  const [savingJointTheme, setSavingJointTheme] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [waitingTipOpen, setWaitingTipOpen] = useState(false);

  const myId = profile?.id;
  const isMyRequest = pendingRequest?.requester_id === myId;
  const nameWaiting = activeMode === 'joint' && !!pendingRequest && isMyRequest;
  const partnerLabel = partnerAlias || partnerName || 'Pareja';
  const jointThemeColor = getThemeColor(jointAcc?.theme);

  const accountView = useMemo(() => {
    if (activeMode === 'joint' && jointAcc) {
      const liveJointName =
        pendingRequest && !isMyRequest
          ? pendingRequest.proposed_name
          : activeEditor === 'name' && !pendingRequest && newJointName.trim()
            ? newJointName
            : jointAcc.name;

      return {
        icon: Users,
        kicker: `${profile?.name || 'Tu'} y ${partnerLabel}`,
        name: liveJointName,
        balance: jointAcc.balance,
        cardClass: 'text-white',
        cardStyle: { background: jointThemeColor.color },
        accentClass: '',
        accentStyle: { backgroundColor: jointThemeColor.accentColor },
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
      accentStyle: undefined,
    };
  }, [activeEditor, activeMode, accountName, appTheme.primary, appTheme.secondary, isMyRequest, jointAcc, jointThemeColor.accentColor, jointThemeColor.color, newJointName, partnerLabel, pendingRequest, personalBalance, profile]);

  const loadJoint = useCallback(async () => {
    if (!profile || !isLinked) return;
    const acc = await getJointAccount(profile.id);
    if (!acc?.id) return;
    const nextName = acc.account_name || 'Nuestra cuenta';
    const nextTheme = acc.theme || 'purple';
    setJointAcc({
      id: acc.id,
      balance: acc.balance,
      name: nextName,
      theme: nextTheme,
    });
    setJointBalance(acc.balance);
    setJointAccountMeta({ id: acc.id, name: nextName, theme: nextTheme });
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
  }, [isLinked, profile, setJointAccountMeta, setJointBalance]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAccountName(profile?.account_name || profile?.name || ''), 0);
    return () => window.clearTimeout(timer);
  }, [profile?.account_name, profile?.name]);

  useEffect(() => {
    if (!profile?.id) return;
    void getBalance(profile.id).then(setPersonalBalance);
  }, [profile?.id]);

  useEffect(() => {
    void Promise.resolve().then(loadJoint);
  }, [profile?.id, isLinked, loadJoint]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!jointAcc?.id) return;
    const channel = supabase
      .channel(`account-settings-${jointAcc.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'joint_accounts', filter: `id=eq.${jointAcc.id}` },
        (payload) => {
          const row = payload.new as { id: string; balance?: number; account_name?: string | null; theme?: string | null };
          const nextName = row.account_name || 'Nuestra cuenta';
          const nextTheme = row.theme || 'purple';
          setJointAcc((current) =>
            current
              ? {
                  ...current,
                  balance: Number(row.balance ?? current.balance),
                  name: nextName,
                  theme: nextTheme,
                }
              : current,
          );
          if (typeof row.balance === 'number') setJointBalance(row.balance);
          setJointAccountMeta({ id: row.id, name: nextName, theme: nextTheme });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'name_change_requests', filter: `joint_account_id=eq.${jointAcc.id}` },
        async (payload) => {
          const row = payload.new as { id?: string; requester_id?: string; proposed_name?: string; created_at?: string; status?: string } | null;
          if (row?.status === 'pending' && row.id && row.requester_id && row.proposed_name && row.created_at) {
            setPendingRequest({
              id: row.id,
              requester_id: row.requester_id,
              proposed_name: row.proposed_name,
              created_at: row.created_at,
            });
            return;
          }
          setPendingRequest(null);
          setWaitingTipOpen(false);
          if (row?.status === 'accepted') {
            await loadJoint();
            navigate('/dashboard');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jointAcc?.id, loadJoint, navigate, setJointAccountMeta, setJointBalance]);

  useEffect(() => {
    if (requestedMode === 'joint' && isLinked) setViewMode('couple');
    if (requestedMode === 'personal') setViewMode('personal');
  }, [requestedMode, isLinked, setViewMode]);

  useEffect(() => {
    if (focus !== 'name-request') return;
    const timer = window.setTimeout(() => setActiveEditor('name'), 0);
    return () => window.clearTimeout(timer);
  }, [focus]);

  const savePersonalName = async () => {
    if (!profile || !accountName.trim()) return;
    setSavingPersonal(true);
    setError('');
    const cleanName = accountName.trim();
    const { error: err } = await supabase.from('profiles').update({ account_name: cleanName }).eq('id', profile.id);
    if (!err) {
      updateProfile({ account_name: cleanName });
      setActiveEditor(null);
      setToast('El nombre de tu cuenta fue actualizado');
      window.setTimeout(() => navigate('/dashboard'), 3820);
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

  const handleJointTheme = async (themeId: string) => {
    if (!jointAcc) return;
    setSavingJointTheme(true);
    setError('');
    const result = await updateJointAccountTheme(jointAcc.id, themeId);
    if (result.success) {
      setJointAcc({ ...jointAcc, theme: themeId });
      setJointAccountMeta({ id: jointAcc.id, theme: themeId });
      setActiveEditor(null);
    } else {
      setError(result.error || 'No se pudo cambiar el color.');
    }
    setSavingJointTheme(false);
  };

  const handlePropose = async () => {
    if (!jointAcc || !newJointName.trim()) return;
    setSavingJoint(true);
    setError('');
    const result = await proposeNameChange(jointAcc.id, newJointName.trim());
    if (result.success) {
      setNewJointName('');
      setActiveEditor(null);
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
    const result = await respondNameChange(pendingRequest.id, accept);
    if (result.success) {
      setActiveEditor(null);
      await loadJoint();
      if (accept) navigate('/dashboard');
    } else {
      setError(result.error || 'No se pudo responder.');
    }
    setSavingJoint(false);
  };

  const openNameEditor = () => {
    if (activeEditor === 'name') {
      cancelNameEdit();
      return;
    }
    if (activeMode === 'joint' && jointAcc && !pendingRequest) setNewJointName(jointAcc.name);
    setActiveEditor('name');
  };

  const cancelNameEdit = () => {
    setAccountName(profile?.account_name || profile?.name || '');
    setNewJointName(jointAcc?.name || '');
    setActiveEditor(null);
    setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
        <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${accountView.accentClass}`} style={accountView.accentStyle} />
        <div className={`absolute -bottom-10 -left-8 h-24 w-24 rounded-full ${accountView.accentClass}`} style={accountView.accentStyle} />
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
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <input
                    value={activeMode === 'personal' ? accountName : newJointName}
                    onChange={(e) => (activeMode === 'personal' ? setAccountName(e.target.value) : setNewJointName(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (activeMode === 'personal') void savePersonalName();
                        else void handlePropose();
                      }
                      if (e.key === 'Escape') cancelNameEdit();
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
                  <button
                    type="button"
                    onClick={cancelNameEdit}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                    aria-label="Cancelar edicion"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <h3 className="truncate text-2xl font-black">{accountView.name}</h3>
              )}
              {pendingRequest && !isMyRequest ? null : nameWaiting ? (
                <span className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => setWaitingTipOpen((value) => !value)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
                    aria-label="Esperando respuesta"
                  >
                    <Clock3 className="h-4 w-4 animate-spin [animation-duration:1.7s]" />
                  </button>
                  <AnimatePresence>
                    {waitingTipOpen && (
                      <motion.span
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute bottom-full left-1/2 z-20 mb-3 w-56 -translate-x-1/2 rounded-2xl bg-gray-950/95 px-3 py-2 text-center text-xs font-bold leading-snug text-white shadow-2xl"
                      >
                        Esperando a que &lsquo;{partnerLabel}&rsquo; acepte el cambio.
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              ) : activeEditor === 'name' ? null : (
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
            <button
              type="button"
              onClick={() => setActiveEditor(activeEditor === 'color' ? null : 'color')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-all hover:bg-white/25 active:scale-95"
              aria-label="Editar color"
            >
              <Palette className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <MinimalActionToast open={!!toast} message={toast} tone="success" onDismiss={() => setToast('')} />

      {activeEditor === 'color' && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
          {activeMode === 'personal'
            ? personalThemeOptions.map((option) => {
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
              })
            : JOINT_ACCOUNT_THEMES.map((theme) => {
                const active = jointAcc?.theme === theme.id;
                const swatch = getThemeColor(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={savingJointTheme}
                    onClick={() => handleJointTheme(theme.id)}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-full border transition-all ${
                      active ? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-950' : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                    } disabled:opacity-80`}
                    aria-label={theme.label}
                  >
                    <span className="block h-7 w-7 rounded-full" style={{ backgroundColor: swatch.color }} />
                  </button>
                );
              })}
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600 dark:border-red-950 dark:bg-red-950/25 dark:text-red-300"
        >
          {error}
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
