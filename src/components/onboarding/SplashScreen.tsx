import { useEffect, useRef, useState } from 'react';
import { VasijaLoaderAnimation } from './VasijaLoaderAnimation';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [showSkip, setShowSkip] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setShowSkip(true), 1800);
    const finishTimer = window.setTimeout(() => {
      if (!done.current) {
        done.current = true;
        onFinish();
      }
    }, 7100);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const finishNow = () => {
    if (!done.current) {
      done.current = true;
      onFinish();
    }
  };

  return (
    <div className="auth-screen relative">
      <div className="vasija-loader" role="status" aria-live="polite">
        <VasijaLoaderAnimation />

        {showSkip && (
          <button
            type="button"
            onClick={finishNow}
            className="mt-5 rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
