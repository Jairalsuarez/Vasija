import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { WheelPicker } from '../components/ui/WheelPicker';
import { GenderBackground } from '../components/ui/GenderBackground';
import { COUNTRY_CODES } from '../lib/constants';
import { getPasswordStrength } from '../lib/formatters';
import { useProfileStore } from '../store';
import { sendOTP, verifyOTP, signUpWithPhone } from '../services/authService';

const lightInput = 'dark:!bg-white dark:!text-gray-900 dark:!placeholder-gray-400 dark:!border-gray-300';

type Step = 'name' | 'age' | 'gender' | 'phone' | 'otp' | 'password' | 'done';

const GENDERS = [
  { value: 'male' as const, label: 'Hombre', icon: '♂', color: 'text-blue-600' },
  { value: 'female' as const, label: 'Mujer', icon: '♀', color: 'text-pink-500' },
  { value: 'unspecified' as const, label: 'Prefiero no decirlo', icon: '?', color: 'text-gray-400' },
];

interface RegisterPageProps {
  onSwitchToLogin?: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const navigate = useNavigate();
  const { setProfile, markUsedBefore } = useProfileStore();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('male');
  const [countryIdx, setCountryIdx] = useState(0);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ages: number[] = [];
  for (let a = 18; a <= 100; a++) ages.push(a);

  const steps: Step[] = ['name', 'age', 'gender', 'phone', 'otp', 'password'];
  const currentIdx = steps.indexOf(step);

  const fullPhone = `${COUNTRY_CODES[countryIdx].code}${phone}`;

  const canContinue = () => {
    switch (step) {
      case 'name': return name.trim().length >= 2;
      case 'age': return age >= 18;
      case 'gender': return true;
      case 'phone': return phone.trim().length >= 7;
      case 'otp': return otpCode.length === 6;
      case 'password': return password.length >= 6 && getPasswordStrength(password).score >= 2;
      default: return false;
    }
  };

  const next = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
    setError('');
  };

  const prev = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    setError('');
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    const result = await sendOTP(fullPhone);
    if (!result.success) {
      setError(result.error || 'Error al enviar código');
      setLoading(false);
      return;
    }
    if (result.code) setDevCode(result.code);
    setStep('otp');
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    const result = await verifyOTP(fullPhone, otpCode);
    if (!result.success) {
      setError(result.error || 'Código inválido');
      setLoading(false);
      return;
    }
    setLoading(false);
    next();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const result = await signUpWithPhone(fullPhone, password, {
      name,
      age,
      gender,
      country_code: COUNTRY_CODES[countryIdx].code,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.user) {
      setProfile(result.user);
      markUsedBefore();
      setStep('done');
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 1200);
    }
  };

  const pwStrength = getPasswordStrength(password);

  return (
    <GenderBackground>
      <div className="relative w-full max-w-md px-4 md:px-6">
        {onSwitchToLogin && step !== 'done' && (
          <p className="text-center text-sm text-gray-400 mb-4">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 font-medium hover:underline"
            >
              Inicia sesión
            </button>
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">
            {step === 'done' ? (
              <motion.div
                key="done"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-4 py-20"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-20 h-20" />
                </motion.div>
                <p className="text-2xl font-bold text-gray-900">
                  ¡Bienvenido a Vasija!
                </p>
                <p className="text-sm text-gray-400">Preparando tu espacio financiero...</p>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  {currentIdx > 0 && (
                    <button onClick={prev} className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors">
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                  )}
                  <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-8 h-8" />
                  <span className="text-lg font-bold text-gray-900">
                    Vasija
                  </span>
                </div>

                <div className="flex gap-1.5 mb-6">
                  {steps.map((s, i) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= currentIdx ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {step === 'name' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      ¿Cómo te llamas?
                    </p>
                    <Input
                      label="Nombre completo"
                      placeholder="Ej: Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      className={lightInput}
                    />
                  </div>
                )}

                {step === 'age' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      ¿Cuántos años tienes?
                    </p>
                    <div className="flex justify-center py-4">
                      <WheelPicker
                        values={ages}
                        selected={age}
                        onChange={setAge}
                        label="Edad"
                      />
                    </div>
                  </div>
                )}

                {step === 'gender' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Selecciona tu género
                    </p>
                    <div className="grid gap-3">
                      {GENDERS.map((g) => (
                        <button
                          key={g.value}
                          onClick={() => setGender(g.value)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                            gender === g.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-2xl ${g.color}`}>{g.icon}</span>
                          <span className="font-medium text-gray-900">
                            {g.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'phone' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Tu número de WhatsApp
                    </p>
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
                          autoFocus
                          className={lightInput}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSendCode}
                      loading={loading}
                      disabled={!canContinue()}
                      className="w-full"
                    >
                      <MessageCircle className="w-4 h-4" /> Enviar código por WhatsApp
                    </Button>
                  </div>
                )}

                {step === 'otp' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Ingresa el código de 6 dígitos
                    </p>
                    <div className="flex justify-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-48 text-center text-3xl font-mono tracking-[0.3em] py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-center text-gray-400">
                      Enviamos un código a <span className="font-medium">{fullPhone}</span>
                    </p>
                    {devCode && (
                      <p className="text-xs text-center text-amber-600 font-mono">
                        [DEV] Código: <span className="font-bold text-lg tracking-wider">{devCode}</span>
                      </p>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setStep('phone')}
                      >
                        Cambiar número
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleVerifyCode}
                        loading={loading}
                        disabled={otpCode.length < 6}
                      >
                        <ShieldCheck className="w-4 h-4" /> Verificar
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'password' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Crea una contraseña para tu cuenta
                    </p>
                    <Input
                      label="Contraseña"
                      type="password"
                      placeholder="Mín. 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      className={lightInput}
                    />
                    {password.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i <= pwStrength.score
                                  ? pwStrength.color.replace('bg-', 'bg-')
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${pwStrength.color.replace('bg-', 'text-')}`}>
                          {pwStrength.label}
                        </p>
                      </div>
                    )}
                    <ul className="space-y-1 text-xs text-gray-500">
                      <li className={password.length >= 6 ? 'text-green-600' : ''}>
                        {password.length >= 6 ? '✓' : '○'} Mínimo 6 caracteres
                      </li>
                      <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                        {/[A-Z]/.test(password) ? '✓' : '○'} Una mayúscula
                      </li>
                      <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                        {/[0-9]/.test(password) ? '✓' : '○'} Un número
                      </li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {step === 'password' ? (
                    <Button
                      onClick={handleSubmit}
                      loading={loading}
                      disabled={!canContinue()}
                      className="flex-1"
                    >
                      Crear cuenta
                    </Button>
                  ) : step !== 'otp' && step !== 'phone' && currentIdx < steps.length - 1 ? (
                    <Button
                      onClick={next}
                      disabled={!canContinue()}
                      className="w-full"
                    >
                      Siguiente <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </GenderBackground>
  );
}
