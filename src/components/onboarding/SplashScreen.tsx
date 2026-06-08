import { useEffect, useRef, useState } from 'react';
import { VasijaLoader } from './VasijaLoader';

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
    }, 4500);

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
    <div className="relative">
      <VasijaLoader variant="cold" />
      {showSkip && (
        <button
          type="button"
          onClick={finishNow}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg transition hover:bg-gray-50 dark:border-gray-800 dark:bg-[var(--theme-card-bg)] dark:text-gray-200 dark:hover:bg-[var(--theme-hover)]"
        >
          Continuar
        </button>
      )}
    </div>
  );
}
