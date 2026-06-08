import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeDollarSign, Bell, BriefcaseBusiness, CheckCircle2, Church, Droplets, Edit3, HandCoins, Heart, Home, Info, Landmark, Menu, Moon, Palette, ReceiptText, Repeat2, Sun, Trash2, User, Users, Utensils, WalletCards, Wifi, Wrench, X, Zap, type LucideIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfileStore, useUIStore, useCoupleStore } from '../../store';
import { Switch } from '../ui/Switch';
import { MinimalActionToast } from '../ui/MinimalActionToast';
import { UserMenu } from './UserMenu';
import { useAppTheme } from '../../hooks/useAppTheme';
import { clearNotificationsByIds, getNotifications, markNotificationsRead, type AppNotification } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/formatters';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/movements': 'Movimientos',
  '/debts': 'Deudas',
  '/savings': 'Ahorros',
  '/tithes': 'Diezmo',
  '/home': 'Hogar',
  '/goals': 'Metas',
  '/reports': 'Reportes',
  '/couple': 'Pareja',
  '/accounts': 'Cuentas',
  '/settings': 'Ajustes',
  '/profile': 'Perfil',
  '/about': 'Acerca de',
};

type NotificationVisual = {
  icon: LucideIcon;
  tone: 'default' | 'success' | 'warning' | 'info' | 'money';
  label: string;
  title: string;
  detail: string;
};

type NotificationScope = 'personal' | 'couple';

export function TopBar() {
  const [showCoupleNotice, setShowCoupleNotice] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useProfileStore();
  const { theme, setTheme, toggleSidebar, toggleUserMenu } = useUIStore();
  const { viewMode, toggleViewMode, isLinked, setViewMode } = useCoupleStore();
  const appTheme = useAppTheme();
  const activeNotificationScope: NotificationScope = viewMode === 'couple' && isLinked ? 'couple' : 'personal';

  const playMoneySound = (kind: 'income' | 'expense') => {
    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const now = ctx.currentTime;
      const tones = kind === 'income' ? [880, 1174, 1568] : [392, 330, 262];
      [0, 0.055, 0.11].forEach((offset, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = kind === 'income' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(tones[index], now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(kind === 'income' ? 0.05 : 0.032, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
      window.setTimeout(() => void ctx.close(), 500);
    } catch {
      // Browser may block audio without recent user gesture.
    }
  };

  const playLoveSwitchSound = (enabled: boolean) => {
    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const now = ctx.currentTime;
      const tones = enabled ? [523.25, 659.25, 783.99, 1046.5] : [783.99, 659.25];
      tones.forEach((tone, index) => {
        const offset = index * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(tone, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(enabled ? 0.035 : 0.022, now + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
      window.setTimeout(() => void ctx.close(), 520);
    } catch {
      // Browser may block audio without recent user gesture.
    }
  };

  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => setToastNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const loadNotifications = async () => {
      const data = await getNotifications(profile.id);
      if (!cancelled) setNotifications(filterNotificationsByScope(data, activeNotificationScope));
    };

    const showBrowserNotification = async (notification: AppNotification) => {
      setToastNotification(notification);
      const movementType = typeof notification.metadata?.type === 'string' ? notification.metadata.type : '';
      if (notification.type === 'success' || movementType === 'income' || notification.title.toLowerCase().includes('ingreso')) {
        playMoneySound('income');
      }
      if (movementType === 'expense' || notification.title.toLowerCase().includes('gasto')) {
        playMoneySound('expense');
      }
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          await registration.showNotification(notification.title, {
            body: notification.body,
            icon: '/contenido/LogoAPP.svg',
            badge: '/contenido/LogoAPP.svg',
            tag: notification.id,
          });
          return;
        }

        new Notification(notification.title, {
          body: notification.body,
          icon: '/contenido/LogoAPP.svg',
          tag: notification.id,
        });
      } catch (error) {
        console.warn('Browser notification failed:', error);
      }
    };

    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    const channel = supabase
      .channel(`app-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as AppNotification;
            const incomingScope = typeof incoming.metadata?.scope === 'string' ? incoming.metadata.scope : 'personal';
            if ((activeNotificationScope === 'couple' && incomingScope === 'couple') || (activeNotificationScope === 'personal' && incomingScope !== 'couple')) {
              void showBrowserNotification(incoming);
            }
          }
          void loadNotifications();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [activeNotificationScope, profile?.id]);

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
      setShowCoupleNotice(true);
      return;
    }
    playLoveSwitchSound(viewMode === 'personal');
    toggleViewMode();
  };

  const pageTitle = pathname.startsWith('/home/') ? 'Hogar' : pageTitles[pathname] || '';
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const notificationTitle = activeNotificationScope === 'couple' ? 'Notificaciones en pareja' : 'Notificaciones personales';

  const openNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen && profile?.id) {
      const readAt = new Date().toISOString();
      const ids = notifications.map((item) => item.id);
      setNotifications((items) => items.map((item) => (item.read_at ? item : { ...item, read_at: readAt })));
      await markNotificationsRead(ids);
      const fresh = await getNotifications(profile.id);
      setNotifications(filterNotificationsByScope(fresh, activeNotificationScope));
    }
  };

  // Close notification panel on any outside click/tap
  useEffect(() => {
    if (!notificationsOpen) return;

    const timer = setTimeout(() => {
      const handleOutside = (e: Event) => {
        const target = e.target as Node;
        const panel = document.querySelector('[data-notif-panel]');
        const bell = document.querySelector('[data-notif-bell]');
        if (panel && !panel.contains(target) && bell && !bell.contains(target)) {
          setNotificationsOpen(false);
        }
      };
      document.addEventListener('click', handleOutside, true);
      document.addEventListener('touchstart', handleOutside, true);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [notificationsOpen, setNotificationsOpen]);

  const handleDeleteNotification = async (item: AppNotification) => {
    if (!profile?.id) return;
    const previous = notifications;
    setNotifications((items) => items.filter((current) => current.id !== item.id));
    const ok = await clearNotificationsByIds([item.id]);
    if (!ok) {
      setNotifications(previous);
      setToastNotification({
        id: `delete-error-${Date.now()}`,
        user_id: profile.id,
        title: 'No se pudo eliminar',
        body: 'IntÃ©ntalo otra vez en unos segundos.',
        type: 'warning',
        read_at: new Date().toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
      });
      return;
    }
    if (activeNotificationScope === 'couple') {
      setToastNotification({
        id: `delete-${Date.now()}`,
        user_id: profile.id,
        title: 'NotificaciÃ³n eliminada',
        body: 'La bandeja de pareja se actualizÃ³.',
        type: 'success',
        read_at: new Date().toISOString(),
        metadata: { scope: 'couple' },
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleClearNotifications = async () => {
    if (!profile?.id || notifications.length === 0) return;
    const previous = notifications;
    const ids = notifications.map((item) => item.id);
    setNotifications([]);
    const ok = await clearNotificationsByIds(ids);
    if (!ok) {
      setNotifications(previous);
      setToastNotification({
        id: `clear-error-${Date.now()}`,
        user_id: profile.id,
        title: 'No se pudieron limpiar',
        body: 'IntÃ©ntalo otra vez en unos segundos.',
        type: 'warning',
        read_at: new Date().toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
      });
      return;
    }
    if (activeNotificationScope === 'couple') {
      setToastNotification({
        id: `clear-${Date.now()}`,
        user_id: profile.id,
        title: 'Notificaciones limpias',
        body: 'La bandeja de pareja quedÃ³ al dÃ­a.',
        type: 'success',
        read_at: new Date().toISOString(),
        metadata: { scope: 'couple' },
        created_at: new Date().toISOString(),
      });
    }
  };
  const resolveNotificationRoute = (item: AppNotification) => {
    const metadata = item.metadata || {};
    if (typeof metadata.route === 'string') return metadata.route;

    if (typeof metadata.movement_id === 'string') {
      const scope = metadata.scope === 'couple' ? 'couple' : 'personal';
      return `/movements?movement=${metadata.movement_id}&scope=${scope}`;
    }

    if (typeof metadata.home_slug === 'string') {
      const scope = metadata.scope === 'couple' ? 'couple' : 'personal';
      const schedule = typeof metadata.schedule_id === 'string' ? `&schedule=${metadata.schedule_id}` : '';
      return `/home/${metadata.home_slug}?scope=${scope}${schedule}`;
    }

    if (typeof metadata.name_change_request_id === 'string') {
      return '/accounts?type=joint&focus=name-request';
    }

    if (item.title.toLowerCase().includes('pago')) return '/home';
    if (item.title.toLowerCase().includes('movimiento') || item.title.toLowerCase().includes('gasto') || item.title.toLowerCase().includes('ingreso')) return '/movements';
    return null;
  };

  const handleNotificationClick = (item: AppNotification) => {
    const route = resolveNotificationRoute(item);
    if (!route) return;
    if (route.includes('type=joint') && isLinked) setViewMode('couple');
    if (route.includes('type=personal')) setViewMode('personal');
    if (route.includes('scope=couple') && isLinked) setViewMode('couple');
    if (route.includes('scope=personal')) setViewMode('personal');
    setNotificationsOpen(false);
    navigate(route);
  };

  const coupleNotice = showCoupleNotice ? (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Cerrar"
        onClick={() => setShowCoupleNotice(false)}
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-pink-600 dark:bg-pink-950/30">
          <Heart className="h-6 w-6" />
        </div>
        <h2 className="text-center text-base font-extrabold text-gray-950 dark:text-white">
          Primero conecta con tu pareja
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Para usar el modo pareja necesitas generar o ingresar un código de conexión.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setShowCoupleNotice(false)}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 dark:border-gray-800 dark:text-gray-300"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCoupleNotice(false);
              navigate('/couple');
            }}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#0b59b3] to-[#e35695] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/10"
          >
            Conectar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-[var(--theme-card-bg)]/95">
        <div className="flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:text-white dark:hover:bg-[var(--theme-primary-light)] active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-white" />
            </button>
            <h1 className="text-base font-bold text-gray-900 dark:text-white md:hidden line-clamp-1">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <Switch
              checked={viewMode === 'couple'}
              onChange={handleViewToggle}
              iconUnchecked={User}
              iconChecked={Users}
            />

            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--theme-primary-light)] active:scale-95 transition-all"
            >
              <ThemeIcon className="w-5 h-5 text-gray-600 dark:text-white" />
            </button>

            <div className="relative">
              <motion.button
                data-notif-bell
                onClick={openNotifications}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--theme-primary-light)] active:scale-95 transition-all"
                aria-label="Notificaciones"
                animate={notificationsOpen ? { scale: [1, 0.88, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-white" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-pink-600 ring-2 ring-white dark:ring-gray-900"
                  />
                )}
              </motion.button>

              <AnimatePresence>
                {notificationsOpen && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.02,
                    x: 0,
                    y: -46,
                    borderRadius: 999,
                    clipPath: 'circle(0px at calc(100% - 18px) -30px)',
                    filter: 'blur(18px) saturate(1.3)',
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                    borderRadius: 26,
                    clipPath: 'circle(620px at calc(100% - 18px) -30px)',
                    filter: 'blur(0px) saturate(1)',
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.02,
                    x: 0,
                    y: -46,
                    borderRadius: 999,
                    clipPath: 'circle(0px at calc(100% - 18px) -30px)',
                    filter: 'blur(18px) saturate(1.35)',
                  }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'calc(100% - 18px) -30px' }}
                  data-notif-panel
                  className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[26px] border border-white/70 bg-[color-mix(in_srgb,white_94%,var(--theme-primary)_6%)] p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[color-mix(in_srgb,#111827_90%,var(--theme-primary)_10%)]"
                >
                  <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[var(--theme-primary)]/14 blur-3xl" />
                  <div className="absolute -left-20 bottom-4 h-32 w-32 rounded-full bg-[var(--theme-secondary)]/12 blur-3xl" />
                  <div className="relative mb-2 flex items-start justify-between gap-3 px-2 pt-2">
                    <p className="text-sm font-black text-gray-950 dark:text-white">{notificationTitle}</p>
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      disabled={notifications.length === 0}
                      className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100 hover:text-red-600 active:scale-95 disabled:bg-white/60 disabled:text-gray-300 disabled:opacity-60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50 dark:disabled:bg-white/10 dark:disabled:text-white/25"
                      aria-label="Limpiar notificaciones"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={`relative space-y-2 overflow-y-auto p-1 pt-2 ${notifications.length === 0 ? 'max-h-24' : 'max-h-80'}`}>
                    {notifications.length === 0 ? (
                      <div className="py-3 text-center">
                        <p className="text-sm font-black text-gray-400 dark:text-white/45">Vacío</p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {notifications.map((item) => {
                          const canOpen = !!resolveNotificationRoute(item);
                          const visual = getNotificationVisual(item);
                          const Icon = visual.icon;
                          return (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: -8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 36, scale: 0.94, filter: 'blur(6px)' }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(item)}
                                className={`group relative flex min-h-[68px] w-full items-center gap-3 overflow-hidden rounded-[22px] border border-white/70 bg-white/88 p-3 text-left shadow-sm transition-all dark:border-white/10 dark:bg-white/[0.06] ${
                                  canOpen ? 'active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md' : ''
                                }`}
                              >
                                <span
                                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)]"
                                  style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
                                >
                                  <Icon className="h-[18px] w-[18px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="line-clamp-1 text-sm font-black text-gray-950 dark:text-white">{visual.title}</span>
                                  <span className="mt-0.5 line-clamp-1 text-xs font-semibold leading-5 text-gray-500 dark:text-gray-400">{visual.detail}</span>
                                </span>
                                <span className="mr-8 shrink-0 text-[10px] font-bold text-gray-400">{formatNotificationTime(item.created_at)}</span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteNotification(item);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void handleDeleteNotification(item);
                                    }
                                  }}
                                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-gray-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 sm:opacity-0 sm:group-hover:opacity-100"
                                  aria-label="Eliminar notificación"
                                >
                                  <X className="h-4 w-4" />
                                </span>
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={toggleUserMenu} className="active:scale-95 transition-transform">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ background: `linear-gradient(135deg, ${appTheme.primary}, ${appTheme.secondary})` }}
                >
                  {profile?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </button>
          </div>
        </div>
        <UserMenu />
      </header>
      <AppToast notification={toastNotification} onDismiss={() => setToastNotification(null)} />
      {coupleNotice ? createPortal(coupleNotice, document.body) : null}
    </>
  );
}

function getNotificationVisual(notification: AppNotification): NotificationVisual {
  const movementType = typeof notification.metadata?.type === 'string' ? notification.metadata.type : '';
  const amount = typeof notification.metadata?.amount === 'number' ? notification.metadata.amount : Number(notification.metadata?.amount);
  const amountLabel = Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : '';
  const category = typeof notification.metadata?.category === 'string' ? notification.metadata.category : '';
  const description = typeof notification.metadata?.description === 'string' ? notification.metadata.description : '';
  const fromLabel = typeof notification.metadata?.from_label === 'string' ? notification.metadata.from_label : '';
  const partnerAction = !!fromLabel && notification.metadata?.from_user_id !== notification.user_id;
  const lowerTitle = notification.title.toLowerCase();
  const lowerBody = notification.body.toLowerCase();

  if (typeof notification.metadata?.name_change_request_id === 'string' || lowerTitle.includes('nombre')) {
    const accepted = lowerTitle.includes('acept');
    const rejected = lowerTitle.includes('rechaz');
    return {
      icon: Edit3,
      tone: accepted ? 'success' : rejected ? 'warning' : 'info',
      label: accepted ? 'Aceptado' : rejected ? 'Rechazado' : 'Nombre',
      title: accepted ? 'Cambio de nombre aceptado' : rejected ? 'Cambio de nombre rechazado' : 'Solicitud de cambio de nombre',
      detail: notification.body.replace(/^.+? quiere /i, 'Quiere '),
    };
  }

  if (typeof notification.metadata?.theme_change_request_id === 'string' || lowerTitle.includes('color')) {
    const accepted = lowerTitle.includes('acept');
    const rejected = lowerTitle.includes('rechaz');
    return {
      icon: Palette,
      tone: accepted ? 'success' : rejected ? 'warning' : 'info',
      label: accepted ? 'Aceptado' : rejected ? 'Rechazado' : 'Color',
      title: accepted ? 'Cambio de color aceptado' : rejected ? 'Cambio de color rechazado' : 'Solicitud de cambio de color',
      detail: notification.body.replace(/^.+? quiere /i, 'Quiere '),
    };
  }

  if (movementType === 'tithe' || textIncludesAny(category, ['diezmo']) || textIncludesAny(description, ['diezmo'])) {
    return {
      icon: Church,
      tone: 'money',
      label: 'Diezmo',
      title: partnerAction ? `${fromLabel} pago diezmo` : 'Pago de diezmo',
      detail: amountLabel || notification.body,
    };
  }

  if (textIncludesAny(category, ['ofrenda']) || textIncludesAny(description, ['ofrenda'])) {
    return {
      icon: HandCoins,
      tone: 'money',
      label: 'Ofrenda',
      title: partnerAction ? `${fromLabel} pago ofrenda` : 'Pago de ofrenda',
      detail: amountLabel || notification.body,
    };
  }

  if (typeof notification.metadata?.home_slug === 'string') {
    return {
      icon: Home,
      tone: notification.type === 'warning' ? 'warning' : 'money',
      label: 'Hogar',
      title: notification.type === 'warning' ? 'Pago pendiente' : 'Pago registrado',
      detail: notification.body,
    };
  }

  if (movementType === 'transfer_to_joint' || lowerTitle.includes('transfer') || lowerBody.includes('transfer')) {
    return {
      icon: Repeat2,
      tone: 'money',
      label: 'Transferencia',
      title: fromLabel ? `${fromLabel} transfirió` : 'Transferiste',
      detail: amountLabel ? `${amountLabel}${category ? `, ${category}` : ''}` : notification.body,
    };
  }

  if (movementType === 'income' || lowerTitle.includes('ingreso')) {
    const income = getIncomeAction(category, description, partnerAction ? fromLabel : '');
    return {
      icon: income.icon,
      tone: 'money',
      label: 'Ingreso',
      title: income.title,
      detail: amountLabel || notification.body,
    };
  }

  if (movementType === 'expense' || lowerTitle.includes('gasto')) {
    const expense = getExpenseAction(category, description, partnerAction ? fromLabel : '');
    return {
      icon: expense.icon,
      tone: 'warning',
      label: 'Gasto',
      title: expense.title,
      detail: amountLabel || notification.body,
    };
  }

  if (notification.type === 'warning') {
    return { icon: AlertTriangle, tone: 'warning', label: 'Aviso', title: notification.title, detail: notification.body };
  }

  if (notification.type === 'success') {
    return { icon: CheckCircle2, tone: 'success', label: 'Listo', title: notification.title, detail: notification.body };
  }

  if (movementType || lowerTitle.includes('gasto') || lowerTitle.includes('ingreso') || lowerTitle.includes('movimiento') || lowerTitle.includes('transfer')) {
    return { icon: WalletCards, tone: 'money', label: 'Actividad', title: notification.title, detail: notification.body };
  }

  if (notification.type === 'info') {
    return { icon: Info, tone: 'info', label: 'Info', title: notification.title, detail: notification.body };
  }

  return { icon: Bell, tone: 'default', label: 'Nuevo', title: notification.title, detail: notification.body };
}

function getIncomeAction(category: string, description: string, actorLabel: string): Pick<NotificationVisual, 'icon' | 'title'> {
  const text = normalizeNotificationText(`${category} ${description}`);
  const subject = getNotificationSubject(description, category);
  const owned = actorLabel.length === 0;

  if (text.includes('salario')) {
    return { icon: BadgeDollarSign, title: owned ? 'Ingresaste un salario' : `${actorLabel} ingreso un salario` };
  }
  if (text.includes('cachuelo')) {
    return { icon: HandCoins, title: owned ? 'Ingresaste un cachuelo' : `${actorLabel} ingreso un cachuelo` };
  }
  if (text.includes('negocio')) {
    return { icon: BriefcaseBusiness, title: owned ? 'Ingresaste de negocios' : `${actorLabel} ingreso de negocios` };
  }
  if (subject) {
    return { icon: ArrowDownToLine, title: owned ? `Ingresaste de ${subject}` : `${actorLabel} ingreso de ${subject}` };
  }

  return { icon: ArrowDownToLine, title: owned ? 'Ingresaste dinero' : `${actorLabel} ingreso dinero` };
}

function getExpenseAction(category: string, description: string, actorLabel: string): Pick<NotificationVisual, 'icon' | 'title'> {
  const text = normalizeNotificationText(`${category} ${description}`);
  const subject = getNotificationSubject(description, category);
  const owned = actorLabel.length === 0;
  const action = (ownTitle: string, partnerTitle: string, icon: LucideIcon) => ({
    icon,
    title: owned ? ownTitle : `${actorLabel} ${partnerTitle}`,
  });

  if (text.includes('arriendo') || text.includes('alquiler')) return action('Pago de alquiler', 'pago alquiler', Home);
  if (text.includes('comida')) return action('Gasto de comida', 'gasto en comida', Utensils);
  if (text.includes('luz')) return action('Pago de luz', 'pago luz', Zap);
  if (text.includes('agua')) return action('Pago de agua', 'pago agua', Droplets);
  if (text.includes('internet')) return action('Pago de internet', 'pago internet', Wifi);
  if (text.includes('mantenimiento')) return action('Pago de mantenimiento', 'pago mantenimiento', Wrench);
  if (text.includes('deuda')) return action(subject ? `Pago de ${subject}` : 'Pago de deuda', subject ? `pago ${subject}` : 'pago deuda', ReceiptText);
  if (text.includes('ahorro')) return action(subject ? `Aporte a ${subject}` : 'Aporte a ahorro', subject ? `aporto a ${subject}` : 'aporto a ahorro', Landmark);
  if (text.includes('meta')) return action(subject ? `Aporte a ${subject}` : 'Aporte a meta', subject ? `aporto a ${subject}` : 'aporto a meta', BadgeDollarSign);
  if (subject) return action(`Gasto de ${subject}`, `gasto en ${subject}`, ArrowUpFromLine);

  return action('Hiciste un gasto', 'hizo un gasto', ArrowUpFromLine);
}

function getNotificationSubject(description: string, category: string) {
  const raw = (description || category || '')
    .split(':')
    .pop()
    ?.trim()
    .toLowerCase() || '';
  const subject = raw.replace(/\s+/g, ' ');
  const generic = ['gasto', 'hogar', 'ingreso', 'general', 'otro ingreso', 'ingreso rapido'];
  return subject && !generic.includes(subject) ? subject : '';
}

function textIncludesAny(value: string, terms: string[]) {
  const normalized = normalizeNotificationText(value);
  return terms.some((term) => normalized.includes(normalizeNotificationText(term)));
}

function normalizeNotificationText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filterNotificationsByScope(items: AppNotification[], scope: NotificationScope) {
  return items.filter((item) => {
    const itemScope = typeof item.metadata?.scope === 'string' ? item.metadata.scope : 'personal';
    return scope === 'couple' ? itemScope === 'couple' : itemScope !== 'couple';
  });
}

function formatNotificationTime(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function AppToast({ notification, onDismiss }: { notification: AppNotification | null; onDismiss: () => void }) {
  const visual = notification ? getNotificationVisual(notification) : null;
  const message = notification ? `${visual?.title || notification.title}${visual?.detail ? `, ${visual.detail}` : ''}` : '';
  const isAccountNameToast = message.toLowerCase().includes('nombre') && message.toLowerCase().includes('actualiz');

  return (
    <MinimalActionToast
      open={!!notification}
      message={isAccountNameToast ? 'El nombre de tu cuenta fue actualizado' : message}
      highlight={isAccountNameToast ? 'fue actualizado' : ''}
      tone={visual?.tone || 'default'}
      onDismiss={onDismiss}
    />
  );
}
