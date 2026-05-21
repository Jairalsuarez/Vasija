import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { VasijaLoaderAnimation } from './components/onboarding/VasijaLoaderAnimation';
import { useProfileStore, useUIStore, useCoupleStore } from './store';
import { useAuth } from './hooks/useAuth';
import { getAppThemeCSS, getAppThemeDarkCSS } from './config/themes';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useProfileStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const retryTimer = window.setTimeout(() => setShowRetry(true), 6000);
    return () => window.clearTimeout(retryTimer);
  }, []);

  return (
    <div className="auth-screen">
      <div className="vasija-loader" role="status" aria-live="polite">
        <VasijaLoaderAnimation />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">
            Vasija
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Preparando tu espacio financiero...
          </p>
        </motion.div>

        <div className="vasija-loader__bar" aria-hidden="true">
          <span />
        </div>

        {showRetry && (
          <motion.button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-[var(--theme-card-bg)] dark:text-gray-200 dark:hover:bg-[var(--theme-hover)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Reintentar
          </motion.button>
        )}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, sessionReady, profile } = useProfileStore();
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
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';

    Object.entries(activeVars).forEach(([key, val]) => root.style.setProperty(key, val));
  }, [profile?.app_theme, profile?.gender, viewMode, isDarkMode]);

  if (!sessionReady) return <LoadingScreen />;

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
