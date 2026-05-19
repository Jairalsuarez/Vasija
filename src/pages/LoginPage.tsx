import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { GenderBackground } from '../components/ui/GenderBackground';
import { signInWithPhone } from '../services/authService';
import { useProfileStore } from '../store';
import { COUNTRY_CODES } from '../lib/constants';

const lightInput = 'dark:!bg-white dark:!text-gray-900 dark:!placeholder-gray-400 dark:!border-gray-300';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const navigate = useNavigate();
  const { setProfile } = useProfileStore();
  const [countryIdx, setCountryIdx] = useState(0);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fullPhone = `${COUNTRY_CODES[countryIdx].code}${phone}`;

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const result = await signInWithPhone(fullPhone, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      setProfile(result.user);
      setLoading(false);
      navigate('/dashboard');
    }
  };

  return (
    <GenderBackground>
      <div className="relative w-full max-w-md px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <div className="flex flex-col items-center mb-8">
              <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-16 h-16 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">
                Vasija
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Bienvenido de nuevo
              </p>
            </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Número de teléfono
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={countryIdx}
                    onChange={(e) => setCountryIdx(Number(e.target.value))}
                    className="h-11 appearance-none bg-white border border-gray-300 rounded-xl px-3 pr-8 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c, i) => (
                      <option key={i} value={i}>
                        {c.label} {c.code}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="0999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className={lightInput}
                  />
                </div>
              </div>
            </div>

            <Input
              label="Contraseña"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={lightInput}
            />

            <Button
              onClick={handleLogin}
              loading={loading}
              disabled={!phone || !password}
              className="w-full"
              size="lg"
            >
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 font-medium hover:underline"
            >
              Regístrate aquí
            </button>
          </p>
        </motion.div>
      </div>
    </GenderBackground>
  );
}
