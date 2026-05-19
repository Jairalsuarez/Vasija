import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'success';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  warningText,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
}: ConfirmModalProps) {
  const Icon = type === 'warning' ? AlertTriangle : type === 'success' ? CheckCircle2 : HelpCircle;
  const iconColor = type === 'warning' ? 'text-amber-500' : type === 'success' ? 'text-green-500' : 'text-purple-500';
  const iconBg = type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30' : type === 'success' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-purple-50 dark:bg-purple-950/30';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden pointer-events-auto p-6 relative">
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />
              
              <div className="flex flex-col items-center text-center mt-2">
                {/* Beautiful Animated Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                </motion.div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-line leading-relaxed">
                  {message}
                </p>

                {/* Optional Warning Alert */}
                {warningText && (
                  <div className="w-full text-left mb-6 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                      {warningText}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1 rounded-xl text-sm py-2.5"
                  onClick={onClose}
                >
                  {cancelText}
                </Button>
                <Button
                  className={`flex-1 rounded-xl text-sm py-2.5 ${
                    type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
