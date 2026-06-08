import { useState, useEffect } from 'react';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { RegisterPage } from './RegisterPage';
import { LoginPage } from './LoginPage';
import { useProfileStore } from '../store';

export function AuthPage() {
  const { hasUsedBefore } = useProfileStore();

  const skipSplash = sessionStorage.getItem('vasija:skip-auth-splash') === '1';
  const [splashDone, setSplashDone] = useState(skipSplash);
  const [showRegister, setShowRegister] = useState(true);

  useEffect(() => {
    if (skipSplash) sessionStorage.removeItem('vasija:skip-auth-splash');
    setShowRegister(!hasUsedBefore);
  }, [hasUsedBefore, skipSplash]);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <>
      {showRegister ? (
        <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginPage onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </>
  );
}
