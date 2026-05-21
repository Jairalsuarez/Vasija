import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Menu, Sun, Moon, User, Users, Heart, Bell, X, Info, CheckCircle2, AlertTriangle, WalletCards } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfileStore, useUIStore, useCoupleStore } from '../../store';
import { Switch } from '../ui/Switch';
import { UserMenu } from './UserMenu';
import { useAppTheme } from '../../hooks/useAppTheme';
import { getNotifications, markNotificationRead, type AppNotification } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/movements': 'Movimientos',
  '/debts': 'Deudas',
  '/home': 'Hogar',
  '/goals': 'Metas',
  '/reports': 'Reportes',
  '/couple': 'Pareja',
  '/accounts': 'Cuentas',
  '/settings': 'Ajustes',
  '/profile': 'Perfil',
  '/about': 'Acerca de',
};

export function TopBar() {
  const [showCoupleNotice, setShowCoupleNotice] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useProfileStore();
  const { theme, setTheme, toggleSidebar, toggleUserMenu } = useUIStore();
  const { viewMode, toggleViewMode, isLinked, setViewMode } = useCoupleStore();
  const appTheme = useAppTheme();

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

  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => setToastNotification(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const loadNotifications = async () => {
      const data = await getNotifications(profile.id);
      if (!cancelled) setNotifications(data);
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
      setBrowserPermission(Notification.permission);
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

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    const channel = supabase
      .channel(`app-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          void showBrowserNotification(payload.new as AppNotification);
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

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
    toggleViewMode();
  };

  const pageTitle = pathname.startsWith('/home/') ? 'Hogar' : pageTitles[pathname] || '';
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const openNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
    } else if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    if (nextOpen) {
      const unread = notifications.filter((item) => !item.read_at);
      await Promise.all(unread.map((item) => markNotificationRead(item.id)));
      if (profile?.id) setNotifications(await getNotifications(profile.id));
    }
  };

  const testBrowserNotification = async () => {
    const testNotification: AppNotification = {
      id: 'test',
      user_id: profile?.id || '',
      title: 'Vasija',
      body: 'Las notificaciones dentro de la app funcionan.',
      type: 'info',
      read_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setToastNotification(testNotification);

    if (!('Notification' in window)) return;
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    setBrowserPermission(permission);
    if (permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          await registration.showNotification('Vasija', {
            body: 'Las notificaciones del navegador funcionan.',
            icon: '/contenido/LogoAPP.svg',
            badge: '/contenido/LogoAPP.svg',
            tag: 'vasija-test-notification',
          });
          return;
        }

        new Notification('Vasija', {
          body: 'Las notificaciones del navegador funcionan.',
          icon: '/contenido/LogoAPP.svg',
          tag: 'vasija-test-notification',
        });
      } catch (error) {
        console.warn('Test notification failed:', error);
      }
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
              <button
                onClick={openNotifications}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--theme-primary-light)] active:scale-95 transition-all"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-white" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-pink-600 ring-2 ring-white dark:ring-gray-900" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <p className="mb-2 text-sm font-extrabold text-gray-950 dark:text-white">Notificaciones</p>
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-gray-50 p-2 dark:bg-gray-950">
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      Navegador: {browserPermission === 'granted' ? 'activas' : browserPermission === 'denied' ? 'bloqueadas' : 'sin permiso'}
                    </p>
                    <button
                      type="button"
                      onClick={testBrowserNotification}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-white"
                    >
                      Probar
                    </button>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-sm font-semibold text-gray-400">Sin notificaciones</p>
                    ) : (
                      notifications.map((item) => {
                        const canOpen = !!resolveNotificationRoute(item);
                        return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            item.type === 'warning'
                              ? 'border-amber-100 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/20'
                              : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                          } ${canOpen ? 'active:scale-[0.99] hover:brightness-95' : ''}`}
                        >
                          <p className="text-sm font-extrabold text-gray-950 dark:text-white">{item.title}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{item.body}</p>
                          {typeof item.metadata?.scope === 'string' && (
                            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                              {item.metadata.scope === 'couple' ? 'Cuenta pareja' : 'Cuenta personal'}
                            </p>
                          )}
                        </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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
      {notificationsOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[19] cursor-default"
          aria-label="Cerrar notificaciones"
          onClick={() => setNotificationsOpen(false)}
        />
      )}
      <AppToast notification={toastNotification} onDismiss={() => setToastNotification(null)} />
      {coupleNotice ? createPortal(coupleNotice, document.body) : null}
    </>
  );
}

type ToastTone = {
  accent: string;
  aura: string;
  iconBg: string;
  icon: typeof Info;
  label: string;
};

function AppToast({ notification, onDismiss }: { notification: AppNotification | null; onDismiss: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-5, 0, 5]);
  const opacity = useTransform(x, [-260, -150, 0, 150, 260], [0, 0.75, 1, 0.75, 0]);
  const movementType = typeof notification?.metadata?.type === 'string' ? notification.metadata.type : '';
  const tone = useMemo(() => getToastTone(notification, movementType), [notification, movementType]);
  const Icon = tone.icon;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 120 || Math.abs(info.velocity.x) > 720) {
      onDismiss();
    }
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[1200] flex justify-center sm:bottom-6">
      <AnimatePresence>
        {notification ? (
          <motion.div
            key={notification.id}
            className="pointer-events-auto w-full max-w-[430px] touch-pan-y"
            initial={{ y: 36, opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
            animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ y: 28, opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.32}
            onDragEnd={handleDragEnd}
            role="status"
            aria-live="polite"
          >
            <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-50/95 p-1 shadow-[0_22px_60px_rgba(15,23,42,0.20)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
              <div
                className="absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl"
                style={{ background: tone.aura }}
              />
              <div className="relative flex items-start gap-3 rounded-[20px] bg-white/80 px-3.5 py-3 dark:bg-[var(--theme-card-bg)]/82">
                <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: tone.iconBg }}>
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[var(--theme-card-bg)]" style={{ background: tone.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: tone.accent }}>
                      {tone.label}
                    </span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  </div>
                  <p className="line-clamp-1 text-sm font-black text-slate-950 dark:text-white">{notification.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-[var(--theme-text-secondary)]">
                    {notification.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-90 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Quitar notificacion"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <motion.div
                className="h-1 origin-left rounded-full"
                style={{ background: tone.iconBg }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5.2, ease: 'linear' }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function getToastTone(notification: AppNotification | null, movementType: string): ToastTone {
  const lowerTitle = notification?.title.toLowerCase() || '';

  if (notification?.type === 'warning') {
    return {
      accent: '#d97706',
      aura: 'rgba(245, 158, 11, 0.28)',
      iconBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
      icon: AlertTriangle,
      label: 'Aviso',
    };
  }

  if (notification?.type === 'success' || movementType === 'income' || lowerTitle.includes('ingreso')) {
    return {
      accent: '#059669',
      aura: 'rgba(16, 185, 129, 0.24)',
      iconBg: 'linear-gradient(135deg, #10b981, #047857)',
      icon: CheckCircle2,
      label: 'Listo',
    };
  }

  if (movementType === 'expense' || lowerTitle.includes('gasto')) {
    return {
      accent: '#e35695',
      aura: 'rgba(227, 86, 149, 0.24)',
      iconBg: 'linear-gradient(135deg, #e35695, #be185d)',
      icon: WalletCards,
      label: 'Movimiento',
    };
  }

  return {
    accent: '#0b59b3',
    aura: 'rgba(11, 89, 179, 0.22)',
    iconBg: 'linear-gradient(135deg, #0b59b3, #2563eb)',
    icon: Info,
    label: 'Nuevo',
  };
}
