import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { signIn } from '../services/authService';
import { useProfileStore } from '../store';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { user, error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    if (user) {
      useProfileStore.setState({ isEntering: true, profile: user, isAuthenticated: true });
      sessionStorage.setItem('vasija:skip-auth-splash', '1');
    }
    setLoading(false);
  };

  // Framer Motion variants for stagger entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 350, damping: 25 },
    },
  };

  return (
    <div className="auth-screen">
      <div className="w-full max-w-[440px] px-4 py-5 sm:px-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <div className="auth-card">
            <div className="flex flex-col items-center mb-7 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mb-3 flex items-center justify-center"
              >
                <img
                  src="/contenido/LogoAPP.svg"
                  alt="Vasija"
                  className="w-20 h-20 drop-shadow-sm"
                />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.25 }}
                className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight"
              >
                Vasija
              </motion.h1>
            </div>

            {/* Input Form Section */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {error && (
                <motion.div
                  variants={itemVariants}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50"
                >
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[var(--theme-primary)] transition-colors duration-250" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)] focus:border-transparent transition-all"
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                    Contraseña
                  </label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[var(--theme-primary)] transition-colors duration-250" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="pt-1 sm:pt-2">
                <Button
                  onClick={handleLogin}
                  loading={loading}
                  disabled={!email || !password}
                  className="w-full py-3.5 text-sm sm:text-base font-bold rounded-xl active:scale-[0.98] transition-transform"
                >
                  Iniciar sesión
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center pt-2">
                <p className="text-sm text-gray-400 font-medium">
                  ¿Eres nuevo en Vasija?{' '}
                  <button
                    onClick={onSwitchToRegister}
                    className="text-[var(--theme-primary)] font-bold hover:underline transition-all"
                  >
                    Crea una cuenta
                  </button>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
