import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  Car,
  Droplets,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  Phone,
  Plane,
  Plus,
  ShieldCheck,
  Shirt,
  Sofa,
  Sparkles,
  Utensils,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCoupleStore, useProfileStore } from '../store';
import { Button } from '../components/ui/Button';

const homeItems = [
  { name: 'Arriendo', slug: 'arriendo', icon: Home },
  { name: 'Hipoteca', slug: 'hipoteca', icon: Home },
  { name: 'Comida', slug: 'comida', icon: Utensils },
  { name: 'Luz', slug: 'luz', icon: Zap },
  { name: 'Agua', slug: 'agua', icon: Droplets },
  { name: 'Internet', slug: 'internet', icon: Wifi },
  { name: 'Telefono', slug: 'telefono', icon: Phone },
  { name: 'Seguro', slug: 'seguro', icon: ShieldCheck },
  { name: 'Mantenimiento', slug: 'mantenimiento', icon: Wrench },
  { name: 'Limpieza', slug: 'limpieza', icon: Sparkles },
  { name: 'Muebles', slug: 'muebles', icon: Sofa },
  { name: 'Ropa', slug: 'ropa', icon: Shirt },
  { name: 'Salud', slug: 'salud', icon: HeartPulse },
  { name: 'Transporte', slug: 'transporte', icon: Car },
  { name: 'Educacion', slug: 'educacion', icon: GraduationCap },
  { name: 'Hijos', slug: 'hijos', icon: Baby },
  { name: 'Mascotas', slug: 'mascotas', icon: PawPrint },
  { name: 'Viajes', slug: 'viajes', icon: Plane },
  { name: 'Bienestar', slug: 'bienestar', icon: Dumbbell },
];

export function HomePage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { viewMode } = useCoupleStore();
  const isCouple = viewMode === 'couple';
  const storageKey = `home-started:${profile?.id || 'anon'}:${viewMode}`;
  const selectedKey = `home-niches:${profile?.id || 'anon'}:${viewMode}`;
  const [started, setStarted] = useState(() => localStorage.getItem(storageKey) === '1');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => {
    const raw = localStorage.getItem(selectedKey);
    return raw ? JSON.parse(raw) : [];
  });

  const introText = useMemo(() => {
    if (isCouple) {
      return 'Elige las areas que pagan juntos y lleva cada pago en orden.';
    }
    return 'Elige las areas de tu casa y organiza sus pagos sin enredos.';
  }, [isCouple]);

  const begin = () => {
    localStorage.setItem(storageKey, '1');
    setStarted(true);
  };

  const addNiche = (slug: string) => {
    setSelectedSlugs((current) => {
      if (current.includes(slug) || current.length >= 8) return current;
      const next = [...current, slug];
      localStorage.setItem(selectedKey, JSON.stringify(next));
      return next;
    });
    setChooserOpen(false);
  };

  const removeNiche = (slug: string) => {
    setSelectedSlugs((current) => {
      const next = current.filter((item) => item !== slug);
      localStorage.setItem(selectedKey, JSON.stringify(next));
      return next;
    });
  };

  const visibleItems = homeItems.filter((item) => selectedSlugs.includes(item.slug));
  const availableItems = homeItems.filter((item) => !selectedSlugs.includes(item.slug));
  const slots = Array.from({ length: 8 }, (_, index) => visibleItems[index] || null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hogar</h2>

      {!started ? (
        <section className="rounded-3xl border border-[var(--theme-card-border)] bg-[var(--theme-primary-light)] p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-card-bg)] text-[var(--theme-primary)] shadow-sm">
            <Home className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-2xl font-extrabold text-gray-950 dark:text-white">
            Pon tu casa en orden
          </h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-600 dark:text-gray-300">
            {introText}
          </p>
          <Button onClick={begin} className="mt-5 w-full py-3 font-extrabold">
            Comenzar
          </Button>
        </section>
      ) : (
        <>
          {selectedSlugs.length === 0 && (
            <section className="rounded-3xl border border-[var(--theme-card-border)] bg-white p-5 shadow-sm dark:bg-[var(--theme-card-bg)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)]">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-gray-950 dark:text-white">
                Agrega tu primera area
              </h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500 dark:text-gray-300">
                Toca la caja con el +, elige una area del hogar y luego configura monto, fecha y pago automatico si lo necesitas.
              </p>
            </section>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Tus gastos</p>
            <p className="text-xs font-extrabold text-gray-400">{selectedSlugs.length}/8</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {slots.map((item, index) => {
              const isNextAdd = !item && index === selectedSlugs.length && selectedSlugs.length < 8;

              if (item) {
                const Icon = item.icon;
                return (
                  <div key={item.slug} className="relative">
                    <button
                      onClick={() => navigate(`/home/${item.slug}`)}
                      className="flex aspect-[1.08] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-primary-light)] p-2.5 text-center text-[var(--theme-primary)] transition active:scale-[0.98]"
                    >
                      <Icon className="h-[76px] w-[76px] shrink-0" strokeWidth={1.65} />
                      <p className="w-full truncate text-xs font-extrabold leading-tight text-gray-950 dark:text-white">{item.name}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNiche(item.slug)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-950/80 text-white"
                      aria-label="Quitar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              if (isNextAdd) {
                return (
                  <button
                    key="add-slot"
                    onClick={() => setChooserOpen(true)}
                    className="flex aspect-[1.08] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] bg-[var(--theme-primary-light)] p-3 text-center transition active:scale-[0.98]"
                  >
                    <Plus className="mb-2 h-[76px] w-[76px] text-[var(--theme-primary)]" strokeWidth={1.8} />
                    <p className="text-sm font-extrabold text-[var(--theme-primary)]">Nueva area</p>
                  </button>
                );
              }

              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-[1.08] rounded-2xl border border-gray-100 bg-gray-50/50 dark:border-gray-900 dark:bg-gray-900/30"
                />
              );
            })}
          </div>
        </>
      )}

      {chooserOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setChooserOpen(false)}
            aria-label="Cerrar"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative max-h-[78vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-950 dark:text-white">Que area quieres organizar?</h3>
              <button
                onClick={() => setChooserOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableItems.map(({ name, slug, icon: Icon }) => (
                <button
                  key={slug}
                  onClick={() => addNiche(slug)}
                  className="rounded-2xl border border-gray-200 p-3 text-left active:scale-[0.98] dark:border-gray-800"
                >
                  <Icon className="mb-3 h-5 w-5 text-[var(--theme-primary)]" />
                  <p className="text-sm font-extrabold text-gray-950 dark:text-white">{name}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
