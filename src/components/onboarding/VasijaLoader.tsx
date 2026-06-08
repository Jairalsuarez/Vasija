import { motion } from 'framer-motion';

interface Props {
  variant: 'cold' | 'entering' | 'reload' | 'logout';
  onFinish?: () => void;
}

const cubic: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LOGO = '/contenido/LogoAPP.svg';

const PROGRESS_DURATION: Record<Props['variant'], number> = {
  cold: 1.8,
  entering: 2.2,
  reload: 2.5,
  logout: 1.2,
};

const LABEL: Record<Props['variant'], string> = {
  cold: 'Vasija',
  entering: 'Cargando...',
  reload: 'Vasija',
  logout: 'Hasta pronto',
};

const BAR_COLOR: Record<Props['variant'], string> = {
  cold: 'linear-gradient(90deg, #0b59b3, #4c94d5)',
  entering: 'linear-gradient(90deg, #0b59b3, #e35695)',
  reload: 'linear-gradient(90deg, #0b59b3, #4c94d5)',
  logout: 'linear-gradient(90deg, #0b59b3, #7c3aed)',
};

export function VasijaLoader({ variant, onFinish }: Props) {
  const duration = PROGRESS_DURATION[variant];
  const isLogout = variant === 'logout';

  return (
    <div className="auth-screen">
      <div className="vasija-loader" role="status" aria-live="polite">
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={isLogout ? { scale: 0.82, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={
            isLogout
              ? { duration: 0.5, delay: duration + 0.15, ease: cubic, onComplete: onFinish }
              : { duration: 0.3 }
          }
          className="flex flex-col items-center gap-6"
        >
          <motion.img
            src={LOGO}
            alt="Vasija"
            style={{
              width: 'clamp(5rem, 24vw, 8rem)',
              filter: 'drop-shadow(0 14px 20px rgba(11,89,179,0.15))',
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: cubic }}
          />

          <motion.p
            style={{
              color: '#0b59b3',
              fontSize: 'clamp(1.2rem, 6vw, 1.8rem)',
              fontWeight: 950,
              lineHeight: 1,
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {LABEL[variant]}
          </motion.p>

          {/* Progress bar track */}
          <div
            style={{
              width: 'clamp(12rem, 60vw, 20rem)',
              height: '0.6rem',
              borderRadius: '999px',
              background: 'rgba(11,89,179,0.12)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                borderRadius: '999px',
                background: BAR_COLOR[variant] || 'linear-gradient(90deg, #0b59b3, #4c94d5)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration, ease: cubic }}
              onAnimationComplete={variant === 'entering' ? onFinish : undefined}
            />
          </div>

          {variant === 'entering' && (
            <motion.p
              style={{
                fontSize: 'clamp(0.75rem, 3.5vw, 0.9rem)',
                fontWeight: 600,
                color: '#64748b',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Preparando tu experiencia...
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
