import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useProfileStore, useFinanceStore } from '../../store';
import { createDebt } from '../../services/debtService';
import type { DebtType } from '../../types';

interface AddDebtModalProps {
  open: boolean;
  onClose: () => void;
  isCouple?: boolean;
}

export function AddDebtModal({ open, onClose, isCouple = false }: AddDebtModalProps) {
  const { profile } = useProfileStore();
  const { addDebt } = useFinanceStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('finite');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsTotal, setInstallmentsTotal] = useState('1');
  const [interestRate, setInterestRate] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!profile || !totalAmount || !name || !dueDate) return;
    setLoading(true);
    const debt = await createDebt({
      user_id: profile.id,
      name,
      type,
      total_amount: parseFloat(totalAmount),
      installments_total: parseInt(installmentsTotal) || 1,
      interest_rate: parseFloat(interestRate) || 0,
      is_couple: isCouple,
      due_date: dueDate,
    });
    if (debt) addDebt(debt);
    setLoading(false);
    onClose();
    setName('');
    setTotalAmount('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva deuda">
      <div className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Ej: Tarjeta de crédito"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex gap-2">
          <button
            onClick={() => setType('finite')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              type === 'finite'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Finita
          </button>
          <button
            onClick={() => setType('infinite')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              type === 'infinite'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Infinita
          </button>
        </div>

        <Input
          label="Monto total"
          type="number"
          placeholder="0.00"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />

        {type === 'finite' && (
          <Input
            label="Número de cuotas"
            type="number"
            placeholder="12"
            value={installmentsTotal}
            onChange={(e) => setInstallmentsTotal(e.target.value)}
          />
        )}

        <Input
          label="Tasa de interés (%)"
          type="number"
          placeholder="0"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
        />

        <Input
          label="Fecha de vencimiento"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!name || !totalAmount || !dueDate}
          className="w-full"
        >
          Agregar deuda
        </Button>
      </div>
    </Modal>
  );
}
