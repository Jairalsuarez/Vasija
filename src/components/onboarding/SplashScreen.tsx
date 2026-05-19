import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Target, Sparkles } from 'lucide-react';
import { GenderBackground } from '../ui/GenderBackground';

const slides = [
  { phrase: 'Finanzas en pareja', Icon: Heart },
  { phrase: 'Metas en común', Icon: Target },
  { phrase: 'Amor y prosperidad', Icon: Sparkles },
];

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => {
        const next = prev + 1;
        if (next >= slides.length) {
          clearInterval(interval);
          setTimeout(() => {
            if (!done.current) {
              done.current = true;
              onFinish();
            }
          }, 300);
          return prev;
        }
        return next;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  const { phrase, Icon } = slides[idx];

  return (
    <GenderBackground>
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            exit={{ rotate: 180, scale: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Icon className="w-14 h-14 text-white" />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="h-8 mt-8 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-light text-gray-700 tracking-wide whitespace-nowrap"
            >
              {phrase}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-16 flex gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === idx ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </GenderBackground>
  );
}
