import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { MOVEMENT_CATEGORIES } from '../../lib/constants';
import { useProfileStore, useFinanceStore, useUIStore } from '../../store';
import { createMovement } from '../../services/movementService';
import type { MovementType } from '../../types';
import { ConfirmModal } from '../ui/ConfirmModal';

interface AddMovementModalProps {
  open: boolean;
  onClose: () => void;
  isCouple?: boolean;
}

export function AddMovementModal({ open, onClose, isCouple = false }: AddMovementModalProps) {
  const { profile } = useProfileStore();
  const { addMovement } = useFinanceStore();
  const { autoTithe } = useUIStore();
  const [type, setType] = useState<MovementType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(MOVEMENT_CATEGORIES[1]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    warningText?: string;
    onConfirm: () => void;
    type?: 'warning' | 'info';
  } | null>(null);

  const handleSubmit = async (bypassConfirm = false) => {
    if (!profile || !amount) return;

    if (isCouple && !bypassConfirm) {
      if (type === 'income') {
        setConfirmModalConfig({
          title: "Confirmar Ingreso Compartido",
          message: "¿Estás seguro de registrar este ingreso directamente en la cuenta compartida?",
          warningText: "💡 Consejo financiero: La forma recomendada es registrar el ingreso en tu cuenta personal y luego realizar una transferencia a \"Nuestro dinero\" para mantener un historial de movimientos ordenado.",
          type: 'warning',
          onConfirm: () => handleSubmit(true),
        });
        return;
      } else {
        setConfirmModalConfig({
          title: "Confirmar Gasto Compartido",
          message: "¿Estás seguro de registrar este gasto en la cuenta de la pareja?",
          type: 'info',
          onConfirm: () => handleSubmit(true),
        });
        return;
      }
    }

    setLoading(true);
    const { movement } = await createMovement({
      user_id: profile.id,
      type,
      amount: parseFloat(amount),
      description: description.trim() || category,
      category,
      date,
      is_couple: isCouple,
    }, autoTithe);
    if (movement) addMovement(movement);
    setLoading(false);
    onClose();
    setAmount('');
    setDescription('');
  };

  return (
    <>
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              type === 'income'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Ingreso
          </button>
          <button
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              type === 'expense'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Gasto
          </button>
        </div>

        <Input
          label="Monto"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />

        <Input
          label="Descripción"
          placeholder="¿En qué gastaste?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            Categoría
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MOVEMENT_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Button
          onClick={() => handleSubmit()}
          loading={loading}
          disabled={!amount}
          className="w-full"
        >
          Agregar movimiento
        </Button>
      </div>
    </Modal>
    {confirmModalConfig && (
      <ConfirmModal
        open={!!confirmModalConfig}
        onClose={() => setConfirmModalConfig(null)}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        warningText={confirmModalConfig.warningText}
        type={confirmModalConfig.type}
      />
    )}
    </>
  );
}
