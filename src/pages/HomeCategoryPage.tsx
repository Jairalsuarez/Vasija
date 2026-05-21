import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarClock, CheckCircle2, Repeat, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCoupleStore, useFinanceStore, useProfileStore } from '../store';
import { createMovement, getMovements } from '../services/movementService';
import { getBalance } from '../services/movementService';
import { getJointAccountBalance } from '../services/jointAccountService';
import { saveHomePaymentSchedule } from '../services/homePaymentService';
import { formatCurrency } from '../lib/formatters';

const categoryMap: Record<string, { name: string }> = {
  arriendo: { name: 'Arriendo' },
  hipoteca: { name: 'Hipoteca' },
  comida: { name: 'Comida' },
  luz: { name: 'Luz' },
  agua: { name: 'Agua' },
  internet: { name: 'Internet' },
  telefono: { name: 'Telefono' },
  seguro: { name: 'Seguro' },
  mantenimiento: { name: 'Mantenimiento' },
  limpieza: { name: 'Limpieza' },
  muebles: { name: 'Muebles' },
  ropa: { name: 'Ropa' },
  salud: { name: 'Salud' },
  transporte: { name: 'Transporte' },
  educacion: { name: 'Educacion' },
  hijos: { name: 'Hijos' },
  mascotas: { name: 'Mascotas' },
  viajes: { name: 'Viajes' },
  bienestar: { name: 'Bienestar' },
};

interface Plan {
  amount: string;
  autoAmount: string;
  dueDate: string;
  dueTime: string;
  automatic: boolean;
  remind: boolean;
}

const defaultPlan = (): Plan => ({
  amount: '',
  autoAmount: '',
  dueDate: '',
  dueTime: '08:00',
  automatic: false,
  remind: true,
});

export function HomeCategoryPage() {
  const navigate = useNavigate();
  const { slug = 'arriendo' } = useParams();
  const config = categoryMap[slug] || categoryMap.arriendo;
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const { movements, setMovements } = useFinanceStore();
  const isCouple = viewMode === 'couple';
  const storageKey = `home-plan:${profile?.id || 'anon'}:${slug}:${viewMode}`;

  const [plan, setPlan] = useState<Plan>(() => defaultPlan());
  const [loading, setLoading] = useState(false);
  const [accountBalance, setAccountBalance] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    setPlan(raw ? { ...defaultPlan(), ...JSON.parse(raw) } : defaultPlan());
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(plan));
  }, [storageKey, plan]);

  const load = async () => {
    if (!profile) return;
    const [movs, balance] = await Promise.all([
      getMovements(profile.id, isCouple, profile.partner_id),
      isCouple ? getJointAccountBalance(profile.id) : getBalance(profile.id),
    ]);
    setMovements(movs);
    setAccountBalance(balance);
  };

  useEffect(() => { load(); }, [profile?.id, profile?.partner_id, isCouple]);

  const categoryMovements = useMemo(
    () => movements.filter((m) => m.category === 'Hogar' && m.description.toLowerCase().includes(config.name.toLowerCase())),
    [movements, config.name],
  );

  const saveExpense = async (amount: string, description = config.name) => {
    if (!profile || !amount || parseFloat(amount) <= 0) return;
    const value = parseFloat(amount);
    if (value > accountBalance) {
      setError(`Saldo insuficiente. Disponible: ${formatCurrency(accountBalance)}.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    await createMovement({
      user_id: profile.id,
      type: 'expense',
      amount: value,
      description: `${config.name}: ${description}`,
      category: 'Hogar',
      date: new Date().toISOString().split('T')[0],
      is_couple: isCouple,
    });
    await load();
    setSuccess('Pago registrado en movimientos.');
    setLoading(false);
  };

  const registerPayment = async () => {
    const amount = plan.automatic ? (plan.autoAmount || plan.amount) : plan.amount;
    if (!plan.automatic) {
      await saveExpense(amount, 'Pago manual');
      return;
    }

    if (!profile || !plan.dueDate || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await saveHomePaymentSchedule({
      homeSlug: slug,
      homeName: config.name,
      amount: parseFloat(amount),
      dueDate: plan.dueDate,
      dueTime: plan.dueTime,
      isCouple,
      remind: plan.remind,
    });
    if (result.success) {
      setSuccess('Pago automatico guardado. Se procesara en Supabase cuando llegue la fecha y hora.');
    } else {
      setError(result.error || 'No se pudo guardar el pago automatico.');
    }
    setLoading(false);
  };

  const paymentAmount = parseFloat((plan.automatic ? (plan.autoAmount || plan.amount) : plan.amount) || '0');
  const canPay = plan.automatic
    ? paymentAmount > 0 && !!plan.dueDate
    : paymentAmount > 0 && paymentAmount <= accountBalance;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="rounded-xl border border-gray-200 p-2 dark:border-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{config.name}</h2>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 rounded-2xl bg-gray-50 p-3 dark:bg-gray-950">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
            Saldo {isCouple ? 'cuenta conjunta' : 'cuenta personal'}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-gray-950 dark:text-white">
            {formatCurrency(accountBalance)}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/20">
            <p className="text-xs font-bold text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-950 dark:bg-green-950/20">
            <p className="text-xs font-bold text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900 dark:text-white">
          <CalendarClock className="h-4 w-4 text-[var(--theme-primary)]" /> Configurar pago
        </h3>
        <div className="space-y-3">
          <Input label="Fecha de pago" type="date" value={plan.dueDate} onChange={(e) => setPlan((p) => ({ ...p, dueDate: e.target.value }))} />
          <Input label={`Monto de ${config.name.toLowerCase()}`} type="number" value={plan.amount} onChange={(e) => setPlan((p) => ({ ...p, amount: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setPlan((p) => ({ ...p, automatic: !p.automatic }))}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)]">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900 dark:text-white">Pago automatico</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {plan.automatic ? 'Configura el descuento.' : 'Si no, lo registras manualmente.'}
              </p>
            </div>
          </div>
          <span className={`h-7 w-12 rounded-full p-1 transition ${plan.automatic ? 'bg-[var(--theme-primary)]' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <span className={`block h-5 w-5 rounded-full bg-white transition ${plan.automatic ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      </section>

      {plan.automatic && (
        <section className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-primary-light)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900 dark:text-white">
            <Repeat className="h-4 w-4 text-[var(--theme-primary)]" /> Automatico
          </h3>
          <div className="space-y-3">
            <Input
              label="Cuanto descontar"
              type="number"
              value={plan.autoAmount}
              onChange={(e) => setPlan((p) => ({ ...p, autoAmount: e.target.value }))}
              placeholder={plan.amount || '0.00'}
            />
            <Input label="Hora" type="time" value={plan.dueTime} onChange={(e) => setPlan((p) => ({ ...p, dueTime: e.target.value }))} />
            <button
              type="button"
              onClick={() => setPlan((p) => ({ ...p, remind: !p.remind }))}
              className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left dark:bg-gray-900"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold text-gray-900 dark:text-white">
                <Bell className="h-4 w-4 text-[var(--theme-primary)]" /> Recordar pago
              </span>
              <span className={`h-7 w-12 rounded-full p-1 transition ${plan.remind ? 'bg-[var(--theme-primary)]' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition ${plan.remind ? 'translate-x-5' : ''}`} />
              </span>
            </button>
          </div>
        </section>
      )}

      <Button onClick={registerPayment} loading={loading} disabled={!canPay} className="w-full py-3 font-extrabold">
        <Wallet className="h-4 w-4" /> {plan.automatic ? 'Guardar automatico' : `Registrar pago de ${config.name}`}
      </Button>

      <section className="space-y-2">
        {categoryMovements.slice(0, 5).map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{m.description}</p>
                <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString('es')}</p>
              </div>
            </div>
            <p className="text-sm font-extrabold text-red-600">-{formatCurrency(m.amount)}</p>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
