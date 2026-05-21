import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  iconChecked?: LucideIcon;
  iconUnchecked?: LucideIcon;
}

export function Switch({ checked, onChange, label, disabled, iconChecked: IconChecked, iconUnchecked: IconUnchecked }: SwitchProps) {
  const Icon = checked ? IconChecked : IconUnchecked;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)] focus:ring-offset-2 ${
        checked
          ? 'bg-[var(--theme-toggle-bg)]'
          : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md ${
          checked ? 'ml-6' : 'ml-1'
        }`}
      >
        {Icon && <Icon className={`w-3 h-3 ${checked ? 'text-[var(--theme-primary)]' : 'text-blue-600'}`} />}
      </motion.span>
      {label && (
        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </button>
  );
}
