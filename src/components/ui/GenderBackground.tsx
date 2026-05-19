import { type ReactNode } from 'react';
import { Venus, Mars } from 'lucide-react';

const bgIcons = [
  { Icon: Mars, color: '#2563EB', x: '5%', y: '8%', size: 72, opacity: 0.12 },
  { Icon: Venus, color: '#EC4899', x: '88%', y: '5%', size: 64, opacity: 0.12 },
  { Icon: Venus, color: '#EC4899', x: '12%', y: '35%', size: 52, opacity: 0.10 },
  { Icon: Mars, color: '#2563EB', x: '78%', y: '30%', size: 56, opacity: 0.10 },
  { Icon: Mars, color: '#2563EB', x: '3%', y: '68%', size: 60, opacity: 0.11 },
  { Icon: Venus, color: '#EC4899', x: '85%', y: '72%', size: 68, opacity: 0.11 },
  { Icon: Mars, color: '#2563EB', x: '50%', y: '1%', size: 44, opacity: 0.08 },
  { Icon: Venus, color: '#EC4899', x: '1%', y: '52%', size: 50, opacity: 0.09 },
  { Icon: Mars, color: '#2563EB', x: '95%', y: '50%', size: 48, opacity: 0.09 },
  { Icon: Venus, color: '#EC4899', x: '40%', y: '94%', size: 42, opacity: 0.08 },
  { Icon: Mars, color: '#2563EB', x: '22%', y: '58%', size: 38, opacity: 0.07 },
  { Icon: Venus, color: '#EC4899', x: '62%', y: '12%', size: 44, opacity: 0.07 },
  { Icon: Mars, color: '#2563EB', x: '70%', y: '90%', size: 50, opacity: 0.08 },
  { Icon: Venus, color: '#EC4899', x: '33%', y: '42%', size: 40, opacity: 0.07 },
  { Icon: Mars, color: '#2563EB', x: '58%', y: '62%', size: 36, opacity: 0.06 },
  { Icon: Venus, color: '#EC4899', x: '18%', y: '85%', size: 46, opacity: 0.08 },
  { Icon: Mars, color: '#2563EB', x: '45%', y: '20%', size: 40, opacity: 0.06 },
  { Icon: Venus, color: '#EC4899', x: '75%', y: '55%', size: 36, opacity: 0.06 },
];

export function GenderBackground({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden">
      {bgIcons.map(({ Icon, color, x, y, size, opacity }, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: x, top: y, opacity, width: size, height: size, color }}
        >
          <Icon size={size} />
        </div>
      ))}
      {children}
    </div>
  );
}
