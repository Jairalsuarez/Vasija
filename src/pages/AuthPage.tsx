import { useState, useEffect } from 'react';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { RegisterPage } from './RegisterPage';
import { LoginPage } from './LoginPage';
import { useProfileStore } from '../store';

export function AuthPage() {
  const { hasUsedBefore } = useProfileStore();
  const [splashDone, setSplashDone] = useState(false);
  const [showRegister, setShowRegister] = useState(true);

  useEffect(() => {
    setShowRegister(!hasUsedBefore);
  }, [hasUsedBefore]);

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
