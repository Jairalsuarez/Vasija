import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft, Check, X } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { signUp } from '../services/authService';
import { useProfileStore } from '../store';
import type { Gender } from '../types';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const questionTransition = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0, filter: 'blur(4px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (dir: number) => ({ x: dir > 0 ? -18 : 18, opacity: 0, filter: 'blur(4px)' }),
};

function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
          onClick={onClose}
        />
        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative z-10 border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <img src="/contenido/LogoAPP.svg" alt="Vasija" className="w-8 h-8" />
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-none">Términos y Condiciones</h3>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-1 block">Vasija · Finanzas Personales</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
            <p className="font-semibold text-gray-900 dark:text-white text-base">
              ¡Bienvenido a Vasija! Nos alegra acompañarte en tu orden financiero familiar y personal.
            </p>
            <p>
              Vasija es una aplicación de administración financiera enfocada para miembros de la Iglesia de Jesucristo, con la visión de guiar a personas y parejas hacia la autosuficiencia, la mayordomía de recursos y la prosperidad en el hogar.
            </p>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-950 dark:text-white uppercase text-[11px] tracking-wider">1. Mayordomía y Autosuficiencia</h4>
              <p>
                Al utilizar Vasija, declaras entender que eres el único responsable del registro de tu información. La aplicación es una guía de productividad y no ofrece asesoría financiera o tributaria con certificación legal.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-950 dark:text-white uppercase text-[11px] tracking-wider">2. Honestidad e Integridad</h4>
              <p>
                De acuerdo con la norma de conducta de nuestra comunidad, te comprometes a ingresar datos con absoluta veracidad, promoviendo la honradez plena en tus transacciones, deudas e ingresos.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-950 dark:text-white uppercase text-[11px] tracking-wider">3. Privacidad y Seguridad</h4>
              <p>
                Vasija resguarda tu privacidad aplicando estrictas políticas de base de datos (RLS) en Supabase. El "Modo Pareja" se habilita únicamente bajo el consentimiento libre e informado de ambas partes. La sincronización compartirá exclusivamente los movimientos y metas que decidan coordinar conjuntamente.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-950 dark:text-white uppercase text-[11px] tracking-wider">4. Diezmo Automático</h4>
              <p>
                La función de diezmo automático (10%) provee un cálculo aproximado e informativo basado en tus ingresos registrados para simplificar la elaboración de tu presupuesto. Vasija no ejecuta transacciones externas ni procesa pagos bancarios a ninguna institución.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-950 dark:text-white uppercase text-[11px] tracking-wider">5. Responsabilidad Tecnológica</h4>
              <p>
                Mantenemos los más altos estándares de protección de datos. Sin embargo, el usuario es enteramente responsable del cuidado de sus contraseñas y del acceso físico a su dispositivo.
              </p>
            </div>

            <p className="text-xs text-gray-400 font-medium pt-3 border-t border-gray-100 dark:border-gray-800">
              Última actualización: Mayo de 2026. Al marcar la casilla de aceptación, consientes de manera explícita estos términos.
            </p>
          </div>
          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
            <Button onClick={onClose} size="sm" className="px-6 py-2.5 font-bold">
              Entendido
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { setProfile } = useProfileStore();
  const navigate = useNavigate();

  const goNext = () => { setDir(1); setStep((s) => s + 1); };
  const goBack = () => { setDir(-1); setStep((s) => s - 1); };

  const handleRegister = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!email || !password || !firstName.trim() || !lastName.trim() || !age || !gender || !acceptedTerms) return;
    setLoading(true);
    setError('');
    const { user, error: err } = await signUp(email, password, {
      name: fullName,
      age: parseInt(age),
      gender,
    });
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    if (user) {
      setProfile(user);
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    }
    setLoading(false);
  };

  const steps = [
    {
      title: '¿Cómo te llamas?',
      content: (
        <div className="space-y-3 sm:space-y-4">
          <Input
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Button className="w-full py-3 text-sm font-semibold rounded-xl" onClick={goNext} disabled={!firstName.trim() || !lastName.trim()}>
            Siguiente <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
    {
      title: '¿Cuántos años tienes?',
      content: (
        <div className="space-y-3 sm:space-y-4">
          <Input
            type="number"
            placeholder="Ej: 25"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
            autoFocus
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 rounded-xl" onClick={goBack}>
              <ChevronLeft className="w-4 h-4" /> Atrás
            </Button>
            <Button className="flex-1 rounded-xl" onClick={goNext} disabled={!age || parseInt(age) < 13}>
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: 'Elige cómo te identificas',
      content: (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'unspecified'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => { setGender(g); goNext(); }}
                className={`p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all active:scale-[0.97] cursor-pointer flex flex-col items-center justify-center ${
                  gender === g
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)]'
                    : 'border-gray-200 dark:border-gray-800 hover:border-[var(--theme-primary)]'
                }`}
              >
                <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
                  g === 'male'
                    ? 'bg-blue-50 text-blue-700'
                    : g === 'female'
                    ? 'bg-pink-50 text-pink-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {g === 'male' ? 'H' : g === 'female' ? 'M' : 'O'}
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {g === 'male' ? 'Hombre' : g === 'female' ? 'Mujer' : 'Otro'}
                </span>
              </button>
            ))}
          </div>
          <Button variant="secondary" className="w-full rounded-xl" onClick={goBack}>
            <ChevronLeft className="w-4 h-4" /> Atrás
          </Button>
        </div>
      ),
    },
    {
      title: 'Crea tu acceso',
      content: (
        <div className="space-y-3 sm:space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1 sm:mb-1.5 block">
              Correo electrónico
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--theme-primary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)] focus:border-transparent transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1 sm:mb-1.5 block">
              Contraseña
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--theme-primary)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)] focus:border-transparent transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Términos y Condiciones checkbox */}
          <div className="flex items-start gap-2.5 pt-0.5">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-[var(--theme-primary)] focus:ring-[var(--theme-ring)] cursor-pointer"
            />
            <label htmlFor="terms-checkbox" className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              Acepto los{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[var(--theme-primary)] font-bold hover:underline cursor-pointer focus:outline-none"
              >
                Términos y Condiciones
              </button>{' '}
              y la{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[var(--theme-primary)] font-bold hover:underline cursor-pointer focus:outline-none"
              >
                Política de Privacidad
              </button>{' '}
              de Vasija.
            </label>
          </div>

          <Button
            className="w-full py-3 sm:py-3.5 font-bold shadow-md shadow-[var(--theme-primary-light)] rounded-xl"
            onClick={handleRegister}
            loading={loading}
            disabled={!email || !password || password.length < 6 || !acceptedTerms}
          >
            Crear cuenta
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 rounded-xl" onClick={goBack}>
              <ChevronLeft className="w-4 h-4" /> Atrás
            </Button>
          </div>
        </div>
      ),
    },
  ];

  if (done) {
    return (
      <div className="auth-screen">
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/20"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <motion.img
              src="/contenido/LogoAPP.svg"
              alt="Vasija"
              className="w-16 h-16 mx-auto mb-4 drop-shadow-sm"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
            <motion.p
              className="text-2xl font-extrabold text-gray-900 dark:text-white"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              ¡Bienvenido a Vasija!
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="w-full max-w-[440px] px-4 py-5 sm:px-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <div className="auth-card">
            {/* Logo and Brand */}
            <div className="flex flex-col items-center mb-5 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-3 flex items-center justify-center"
              >
                <img
                  src="/contenido/LogoAPP.svg"
                  alt="Vasija"
                  className="w-20 h-20 drop-shadow-sm"
                />
              </motion.div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Vasija</h1>
            </div>

            {/* Stepper Dots */}
            <div className="flex justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-7 bg-[var(--theme-primary)]'
                      : i < step
                      ? 'w-2 bg-[var(--theme-primary)] opacity-55'
                      : 'w-2 bg-gray-250 dark:bg-gray-800'
                  }`}
                />
              ))}
            </div>

            <div className="min-h-[180px] overflow-hidden">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={`question-${step}`}
                  custom={dir}
                  variants={questionTransition}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="mb-4 text-center text-lg font-extrabold text-gray-950 dark:text-white">
                    {steps[step].title}
                  </h2>
                  {steps[step].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Switch to Login Link */}
            <motion.p
              className="text-center text-sm text-gray-400 font-medium mt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[var(--theme-primary)] font-bold hover:underline transition-all"
              >
                Inicia sesión
              </button>
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Terms and Conditions Popup Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
}
