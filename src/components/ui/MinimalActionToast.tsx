import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Info, WalletCards, type LucideIcon } from 'lucide-react';

type MinimalActionToastProps = {
  open: boolean;
  message?: string;
  highlight?: string;
  meta?: string;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'money';
  onDismiss?: () => void;
};

const toneIcons: Record<NonNullable<MinimalActionToastProps['tone']>, LucideIcon> = {
  default: Bell,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  money: WalletCards,
};

export function MinimalActionToast({
  open,
  message = 'El nombre de tu cuenta fue actualizado',
  highlight = 'fue actualizado',
  meta = 'ahora',
  tone = 'default',
  onDismiss,
}: MinimalActionToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  if (typeof document === 'undefined') return null;

  useEffect(() => {
    if (!open) return;

    let cleanup: (() => void) | undefined;

    const timer = setTimeout(() => {
      const handleOutside = (e: Event) => {
        if (toastRef.current && !toastRef.current.contains(e.target as Node)) {
          onDismiss?.();
        }
      };
      document.addEventListener('click', handleOutside, true);
      document.addEventListener('touchstart', handleOutside, true);
      cleanup = () => {
        document.removeEventListener('click', handleOutside, true);
        document.removeEventListener('touchstart', handleOutside, true);
      };
    }, 150);

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, [open, onDismiss]);

  const canHighlight = highlight.trim().length > 0;
  const highlightIndex = canHighlight ? message.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  const beforeHighlight = highlightIndex >= 0 ? message.slice(0, highlightIndex).trimEnd() : message;
  const highlightText = highlightIndex >= 0 ? message.slice(highlightIndex, highlightIndex + highlight.length) : '';
  const Icon = toneIcons[tone];

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[1200] flex justify-center px-3 sm:top-8 sm:px-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={toastRef}
            key="minimal-action-toast"
            initial={{ opacity: 0, y: -18, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, scale: 0.985, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative flex min-h-[68px] w-[min(94vw,680px)] items-center overflow-hidden rounded-[24px] border border-white/75 bg-[color-mix(in_srgb,white_92%,var(--theme-primary)_8%)] text-[#1F2937] shadow-[0_22px_55px_rgba(30,41,59,0.16)] backdrop-blur-[22px] dark:border-white/10 dark:bg-[color-mix(in_srgb,#111827_88%,var(--theme-primary)_12%)] dark:text-white"
            role="status"
            aria-live="polite"
            onClick={onDismiss}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-white/80 dark:bg-white/15" />
            <div className="absolute -left-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[var(--theme-primary)]/18 blur-2xl" />
            <div className="absolute -right-14 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[var(--theme-secondary)]/14 blur-2xl" />

            <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--theme-primary)_26%,transparent)]"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
                animate={{ boxShadow: ['0 12px 24px color-mix(in srgb, var(--theme-primary) 20%, transparent)', '0 14px 34px color-mix(in srgb, var(--theme-primary) 34%, transparent)', '0 12px 24px color-mix(in srgb, var(--theme-primary) 20%, transparent)'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" strokeWidth={2.25} />
              </motion.span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-5 tracking-[0.01em] text-[#111827] sm:text-[16px] dark:text-white">
                  {beforeHighlight}
                  {highlightText && (
                    <>
                      {' '}
                      <span className="font-black text-[var(--theme-primary)]">{highlightText}</span>
                    </>
                  )}
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <motion.div
                    className="h-full origin-left rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))' }}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 3.5, ease: 'linear' }}
                  />
                </div>
              </div>

              <span className="shrink-0 self-start rounded-full bg-white/65 px-2.5 py-1 text-[11px] font-bold text-[#9CA3AF] shadow-sm dark:bg-white/10 dark:text-white/55 sm:self-center sm:text-xs">
                {meta}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
