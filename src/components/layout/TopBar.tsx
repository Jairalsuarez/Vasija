import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Sun, Moon, User, Users, Heart, Bell } from 'lucide-react';
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

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const loadNotifications = async () => {
      const data = await getNotifications(profile.id);
      if (!cancelled) setNotifications(data);
    };

    const showBrowserNotification = async (notification: AppNotification) => {
      setToastNotification(notification);
      window.setTimeout(() => setToastNotification(null), 4500);
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
    window.setTimeout(() => setToastNotification(null), 4500);

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
      {toastNotification && (
        <div className="fixed inset-x-3 bottom-4 z-[1200] md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2">
          <div className="relative overflow-visible rounded-[20px] border border-[var(--theme-card-border)] bg-white/95 px-4 py-3 shadow-2xl shadow-black/15 backdrop-blur-xl dark:bg-[var(--theme-card-bg)]/95">
            <p className="line-clamp-1 text-sm font-extrabold text-gray-950 dark:text-white">{toastNotification.title}</p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{toastNotification.body}</p>
          </div>
        </div>
      )}
      {coupleNotice ? createPortal(coupleNotice, document.body) : null}
    </>
  );
}
