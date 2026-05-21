import type { CSSProperties } from 'react';

const letters = ['V', 'A', 'S', 'I', 'J', 'A'];

export function VasijaLoaderAnimation() {
  return (
    <div className="vasija-motion-logo" aria-label="Vasija">
      <div className="vasija-motion-logo__word" aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            style={{
              '--i': index,
              '--start-x': `${-260 - index * 22}px`,
              '--look': index < 3 ? '7deg' : '-7deg',
              '--scatter-x': `${(index - 2.5) * 34}px`,
              '--scatter-y': `${index % 2 === 0 ? -22 : 20}px`,
            } as CSSProperties}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="vasija-motion-logo__build" aria-hidden="true">
        <img
          className="vasija-motion-logo__final"
          src="/contenido/LogoAPP.svg"
          alt=""
          draggable="false"
        />
      </div>
    </div>
  );
}
