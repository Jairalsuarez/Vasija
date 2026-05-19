import { motion } from 'framer-motion';
import { APP_VERSION } from '../lib/constants';

export function AboutPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Acerca de
      </h2>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          FinanzasApp - Control financiero para parejas.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Versión {APP_VERSION}
        </p>
      </div>
    </motion.div>
  );
}
