import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

        {showSkip && (
          <motion.button
            type="button"
            onClick={finishNow}
            className="mt-5 rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Continuar
          </motion.button>
        )}
      </div>
    </div>
  );
}
