import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { MovementsPage } from './pages/MovementsPage';
import { DebtsPage } from './pages/DebtsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SavingsPage } from './pages/SavingsPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CouplePage } from './pages/CouplePage';
import { HomePage } from './pages/HomePage';
import { HomeCategoryPage } from './pages/HomeCategoryPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensePage } from './pages/ExpensePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { TransferPage } from './pages/TransferPage';
import { TithesPage } from './pages/TithesPage';
import { VasijaLoader } from './components/onboarding/VasijaLoader';
import { useProfileStore, useFinanceStore, useUIStore, useCoupleStore } from './store';
import { useAuth } from './hooks/useAuth';
import { getAppThemeCSS, getAppThemeDarkCSS } from './config/themes';
import { supabase } from './lib/supabase';
import { getBalance, getMovements } from './services/movementService';
import { getJointAccount } from './services/jointAccountService';
import { getPendingTithes } from './services/titheService';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useProfileStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoadingScreen({ variant = 'cold', onFinish }: { variant?: 'cold' | 'entering' | 'reload' | 'logout'; onFinish?: () => void }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (variant !== 'logout' && variant !== 'entering') {
      const retryTimer = window.setTimeout(() => setShowRetry(true), 6000);
      return () => window.clearTimeout(retryTimer);
    }
  }, [variant]);

  return (
    <>
      <VasijaLoader variant={variant} onFinish={onFinish} />
      {showRetry && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg transition hover:bg-gray-50 dark:border-gray-800 dark:bg-[var(--theme-card-bg)] dark:text-gray-200 dark:hover:bg-[var(--theme-hover)]"
          >
            Reintentar
          </button>
        </div>
      )}
    </>
  );
}

// Self-contained entering loader: pre-loads ALL user data, then navigates to dashboard
function EnteringLoader() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      const profile = useProfileStore.getState().profile;
      if (!profile?.id) {
        useProfileStore.getState().setEntering(false);
        navigate('/dashboard', { replace: true });
        return;
      }
      const profileId = profile.id;
      const viewMode = useCoupleStore.getState().viewMode;
      const isCoupleMode = viewMode === 'couple';

      try {
        const { data: latestProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();

        const profilePartnerId = (latestProfile as { partner_id?: string | null } | null)?.partner_id ?? null;
        const profilePartnerAlias = (latestProfile as { partner_alias?: string | null } | null)?.partner_alias ?? null;
        const isLinked = !!profilePartnerId;

        if (latestProfile) useProfileStore.getState().setProfile(latestProfile);

        const [bal, movs, jointAcc, pending] = await Promise.all([
          getBalance(profileId),
          getMovements(profileId, isCoupleMode, profilePartnerId),
          isLinked ? getJointAccount(profileId) : Promise.resolve(null),
          getPendingTithes(profileId),
        ]);

        if (cancelled) return;

        const fs = useFinanceStore.getState();
        fs.setBalance(bal);
        fs.setMovements(movs);

        if (jointAcc) {
          fs.setJointBalance(jointAcc.balance);
          fs.setJointAccountMeta({
            id: jointAcc.id,
            name: (jointAcc as { account_name?: string }).account_name || 'Nuestra cuenta',
            theme: (jointAcc as { theme?: string }).theme || 'purple',
          });
        }

        const totalTithe = pending.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
        fs.setTitheBalance(totalTithe);

        const cs = useCoupleStore.getState();
        if (isLinked && profilePartnerId) {
          const { data: rawPartner } = await supabase
            .rpc('get_partner_info', { v_partner_id: profilePartnerId })
            .maybeSingle();
          const partnerData = rawPartner as { name: string; avatar_url: string | null } | null;
          cs.setLinked(true);
          cs.setPartner(partnerData?.name || 'Pareja', partnerData?.avatar_url || null, profilePartnerAlias || null);
        } else {
          cs.resetCouple();
        }
      } catch {
        // Proceed even if pre-load fails; dashboard will re-fetch
      }

      if (!cancelled) {
        useProfileStore.getState().setEntering(false);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [navigate]);

  return <LoadingScreen variant="entering" />;
}

function AppRoutes() {
  const { isAuthenticated, isEntering, sessionReady, profile } = useProfileStore();
  const { theme } = useUIStore();
  const { viewMode } = useCoupleStore();
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  );
  useAuth();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const isDarkMode = isAuthenticated && (theme === 'dark' || (theme === 'system' && systemDark));

  useEffect(() => {
    const themeId = profile?.app_theme;
    const isCouple = viewMode === 'couple';
    const lightVars = getAppThemeCSS(themeId, isCouple, profile?.gender);
    const darkVars = getAppThemeDarkCSS(themeId, isCouple, profile?.gender);
    const activeVars = isDarkMode ? darkVars : lightVars;
    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle('dark', isDarkMode);
    body.classList.toggle('dark', isDarkMode);
    root.dataset.theme = isDarkMode ? 'dark' : 'light';
    root.dataset.viewMode = isCouple ? 'couple' : 'personal';
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';

    Object.entries(activeVars).forEach(([key, val]) => root.style.setProperty(key, val));
  }, [profile?.app_theme, profile?.gender, viewMode, isDarkMode]);

  if (isEntering) return <EnteringLoader />;
  if (!sessionReady) return <LoadingScreen variant="cold" />;  // Reload / cold start

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/movements" element={<MovementsPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/expense" element={<ExpensePage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/tithes" element={<TithesPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/home/:slug" element={<HomeCategoryPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/couple" element={<CouplePage />} />
        <Route path="/accounts" element={<AccountSettingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
