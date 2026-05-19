import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useProfileStore, useFinanceStore } from '../../store';
import { createGoal } from '../../services/goalService';
import type { GoalCategory } from '../../types';

const categories: { value: GoalCategory; label: string }[] = [
  { value: 'savings', label: 'Ahorros' },
  { value: 'vacation', label: 'Vacaciones' },
  { value: 'temple', label: 'Templo' },
  { value: 'other', label: 'Otro' },
];

interface AddGoalModalProps {
  open: boolean;
  onClose: () => void;
  isCouple?: boolean;
}

export function AddGoalModal({ open, onClose, isCouple = false }: AddGoalModalProps) {
  const { profile } = useProfileStore();
  const { addGoal } = useFinanceStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!profile || !targetAmount || !name || !deadline) return;
    setLoading(true);
    const goal = await createGoal({
      user_id: profile.id,
      name,
      category,
      target_amount: parseFloat(targetAmount),
      deadline,
      is_couple: isCouple,
    });
    if (goal) addGoal(goal);
    setLoading(false);
    onClose();
    setName('');
    setTargetAmount('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva meta">
      <div className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Ej: Fondo de emergencia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            Categoría
          </label>
          <div className="flex gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  category === c.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Meta ($)"
          type="number"
          placeholder="1000.00"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />

        <Input
          label="Fecha límite"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!name || !targetAmount || !deadline}
          className="w-full"
        >
          Crear meta
        </Button>
      </div>
    </Modal>
  );
}
