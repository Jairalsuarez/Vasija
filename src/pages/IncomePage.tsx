import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Hammer, Plus, Repeat, WalletCards } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCoupleStore, useProfileStore, useUIStore } from '../store';
import { createMovement } from '../services/movementService';

const today = () => new Date().toISOString().split('T')[0];

const incomeSources = [
  { name: 'Salario', category: 'Salario', icon: BriefcaseBusiness },
  { name: 'Cachuelo', category: 'Cachuelo', icon: Hammer },
  { name: 'Negocio', category: 'Negocio', icon: WalletCards },
  { name: 'Otro', category: 'Ingreso', icon: Plus },
];

export function IncomePage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const { autoTithe } = useUIStore();
  const isCouple = viewMode === 'couple';
  const [source, setSource] = useState<(typeof incomeSources)[number] | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [fixed, setFixed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (!source) return 'Ingreso rapido';
    if (source.name === 'Otro') return customSource.trim() || 'Otro ingreso';
    return source.name;
  }, [customSource, source]);

  const resetQuick = () => {
    setSource(null);
    setCustomSource('');
    setDescription('');
    setFixed(false);
    setDate(today());
  };

  const handleBack = () => {
    if (source) {
      resetQuick();
      return;
    }
    navigate('/dashboard');
  };

  const submit = async () => {
    if (!profile) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Pon un monto valido.');
      return;
    }
    setLoading(true);
    setError('');
    const { movement } = await createMovement({
      user_id: profile.id,
      type: 'income',
      amount: value,
      description: description.trim() || title,
      category: source?.category || 'Ingreso',
      date,
      is_couple: isCouple,
    }, autoTithe);
    if (movement) {
      sessionStorage.setItem('vasija:balance-sound', 'income');
      sessionStorage.setItem('vasija:balance-delta', String(value));
    }
    navigate('/dashboard');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="rounded-xl border border-gray-200 p-2 dark:border-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-white">Ingreso</h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{isCouple ? 'Cuenta de pareja' : 'Cuenta personal'}</p>
        </div>
      </div>

      <section>
        <p className="mb-3 text-sm font-black text-gray-950 dark:text-white">Detallar ingreso</p>
        <div className="grid grid-cols-2 gap-3">
          {incomeSources.map((item) => {
            const Icon = item.icon;
            const active = source?.name === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => (active ? resetQuick() : setSource(item))}
                className={`flex min-h-28 flex-col items-center justify-center rounded-3xl border p-4 text-center transition active:scale-[0.98] ${
                  active
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)]'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[var(--theme-card-bg)]'
                }`}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-primary-light)]">
                  <Icon className="h-7 w-7 text-[var(--theme-primary)]" />
                </span>
                <p className="text-sm font-black text-gray-950 dark:text-white">{item.name}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[var(--theme-card-bg)]">
        <h3 className="mb-4 text-lg font-black text-gray-950 dark:text-white">{title}</h3>
        {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="space-y-4">
          <Input label="Monto" type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {source && (
            <>
              {source.name === 'Otro' && (
                <Input label="De donde viene" placeholder="Ej: venta, regalo, reembolso" value={customSource} onChange={(e) => setCustomSource(e.target.value)} />
              )}
              <Input label="Fecha de ingreso" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input label="Descripcion opcional" placeholder="Ej: pago de mayo" value={description} onChange={(e) => setDescription(e.target.value)} />
              {source.name === 'Salario' && (
                <>
                  <button
                    type="button"
                    onClick={() => setFixed(!fixed)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-100 p-3 text-left dark:border-gray-800"
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-gray-950 dark:text-white">
                      <Repeat className="h-4 w-4 text-[var(--theme-primary)]" />
                      Ingreso automaticamente
                    </span>
                    <span className={`h-7 w-12 rounded-full p-1 transition ${fixed ? 'bg-[var(--theme-primary)]' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      <span className={`block h-5 w-5 rounded-full bg-white transition ${fixed ? 'translate-x-5' : ''}`} />
                    </span>
                  </button>
                  {fixed && (
                    <p className="rounded-xl bg-[var(--theme-primary-light)] p-3 text-xs font-bold text-[var(--theme-primary)]">
                      Listo. Por ahora se registra manualmente; luego activamos repeticion automatica.
                    </p>
                  )}
                </>
              )}
            </>
          )}
          <Button onClick={submit} loading={loading} disabled={!amount} className="w-full py-3 font-black">
            <CalendarDays className="h-4 w-4" />
            Confirmar ingreso
          </Button>
        </div>
      </section>
    </motion.div>
  );
}
