import { useRef, useCallback, useEffect } from 'react';

interface WheelPickerProps {
  values: number[];
  selected: number;
  onChange: (value: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  label?: string;
  renderItem?: (value: number) => string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;

export function WheelPicker({
  values,
  selected,
  onChange,
  itemHeight = ITEM_HEIGHT,
  visibleCount = VISIBLE_COUNT,
  label,
  renderItem,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const velocity = useRef(0);
  const lastTime = useRef(0);
  const activeIdx = useRef(values.indexOf(selected));

  const selectedIndex = values.indexOf(selected);
  const totalHeight = values.length * itemHeight;
  const maxOffset = 0;
  const minOffset = -(totalHeight - visibleCount * itemHeight);

  const getOffsetForIndex = useCallback(
    (idx: number) => {
      const centerOffset = (visibleCount * itemHeight) / 2 - itemHeight / 2;
      return -idx * itemHeight + centerOffset;
    },
    [itemHeight, visibleCount],
  );

  const applyItemStyles = useCallback(
    (listEl: HTMLElement, highlightIdx: number) => {
      const items = listEl.children;
      for (let i = 0; i < items.length; i++) {
        const span = items[i].querySelector('span') as HTMLElement;
        if (!span) continue;
        if (i === highlightIdx) {
          span.className = 'text-gray-900 font-semibold transition-all duration-100';
        } else {
          span.className = 'text-gray-400 transition-all duration-100';
        }
      }
    },
    [],
  );

  const updateLinesPosition = useCallback(
    (idx: number, offset: number) => {
      if (!linesRef.current) return;
      const target = idx * itemHeight + offset;
      const clamped = Math.max(0, Math.min((values.length - 1) * itemHeight, target));
      linesRef.current.style.transition = dragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
      linesRef.current.style.transform = `translateY(${clamped}px)`;
    },
    [itemHeight, visibleCount, values.length],
  );

  const snapToIndex = useCallback(
    (idx: number) => {
      if (!listRef.current || !linesRef.current) return;
      const target = getOffsetForIndex(idx);
      listRef.current.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
      listRef.current.style.transform = `translateY(${target}px)`;
      currentY.current = target;
      activeIdx.current = idx;
      applyItemStyles(listRef.current, idx);
      updateLinesPosition(idx, target);
      onChange(values[idx]);
    },
    [getOffsetForIndex, onChange, values, applyItemStyles, updateLinesPosition],
  );

  const getIndexFromOffset = useCallback(
    (offset: number) => {
      const centerOffset = (visibleCount * itemHeight) / 2 - itemHeight / 2;
      const rawIndex = Math.round((-offset + centerOffset) / itemHeight);
      return Math.max(0, Math.min(values.length - 1, rawIndex));
    },
    [itemHeight, visibleCount, values.length],
  );

  const updateHighlightFromOffset = useCallback(
    (offset: number) => {
      if (!listRef.current) return;
      const idx = getIndexFromOffset(offset);
      if (idx !== activeIdx.current) {
        activeIdx.current = idx;
        applyItemStyles(listRef.current, idx);
      }
      updateLinesPosition(idx, offset);
    },
    [getIndexFromOffset, applyItemStyles, updateLinesPosition],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      velocity.current = 0;
      lastTime.current = Date.now();
      if (listRef.current) {
        listRef.current.style.transition = 'none';
        const transform = listRef.current.style.transform;
        const match = transform.match(/translateY\(([-\d.]+)px\)/);
        if (match) currentY.current = parseFloat(match[1]);
      }
      if (linesRef.current) {
        linesRef.current.style.transition = 'none';
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !listRef.current) return;
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) velocity.current = (e.clientY - startY.current) / dt;
      lastTime.current = now;
      const dy = e.clientY - startY.current;
      startY.current = e.clientY;
      let newY = currentY.current + dy;
      newY = Math.max(minOffset, Math.min(maxOffset, newY));
      currentY.current = newY;
      listRef.current.style.transition = 'none';
      listRef.current.style.transform = `translateY(${newY}px)`;
      updateHighlightFromOffset(newY);
    },
    [maxOffset, minOffset, updateHighlightFromOffset],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const momentum = velocity.current * 150;
    let targetY = currentY.current + momentum;
    targetY = Math.max(minOffset, Math.min(maxOffset, targetY));
    const idx = getIndexFromOffset(targetY);
    snapToIndex(idx);
  }, [currentY, velocity, minOffset, maxOffset, getIndexFromOffset, snapToIndex]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY > 0 ? -itemHeight : itemHeight;
      let newY = currentY.current + dy;
      newY = Math.max(minOffset, Math.min(maxOffset, newY));
      currentY.current = newY;
      if (listRef.current) {
        listRef.current.style.transition = 'transform 0.1s ease';
        listRef.current.style.transform = `translateY(${newY}px)`;
        updateHighlightFromOffset(newY);
      }
      const idx = getIndexFromOffset(newY);
      onChange(values[idx]);
    },
    [itemHeight, minOffset, maxOffset, getIndexFromOffset, onChange, values, updateHighlightFromOffset],
  );

  useEffect(() => {
    if (!listRef.current || !linesRef.current) return;
    const offset = getOffsetForIndex(selectedIndex);
    listRef.current.style.transition = 'none';
    listRef.current.style.transform = `translateY(${offset}px)`;
    currentY.current = offset;
    activeIdx.current = selectedIndex;
    applyItemStyles(listRef.current, selectedIndex);
    updateLinesPosition(selectedIndex, offset);
  }, [selectedIndex, getOffsetForIndex, applyItemStyles, updateLinesPosition]);

  const containerHeight = visibleCount * itemHeight;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="text-sm font-medium text-gray-500">
          {label}
        </span>
      )}
      <div
        ref={containerRef}
        className="relative select-none touch-none"
        style={{ height: containerHeight, width: '100%' }}
        onWheel={handleWheel}
      >
        <div
          ref={linesRef}
          className="absolute inset-x-0 z-10 pointer-events-none"
          style={{ top: 0, height: itemHeight }}
        >
          <div className="absolute top-0 h-[2px] bg-blue-300" style={{ left: '-50%', width: '200%' }} />
          <div className="absolute bottom-0 h-[2px] bg-blue-300" style={{ left: '-50%', width: '200%' }} />
        </div>
        <div className="absolute inset-0 overflow-hidden">
          <div
            ref={listRef}
            className="absolute inset-x-0 will-change-transform cursor-grab active:cursor-grabbing"
            style={{ transform: `translateY(${getOffsetForIndex(selectedIndex)}px)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {values.map((val, i) => (
              <div
                key={val}
                className="flex items-center justify-center text-base font-medium"
                style={{ height: itemHeight }}
              >
                <span
                  className={i === selectedIndex ? 'text-gray-900 font-semibold' : 'text-gray-400'}
                >
                  {renderItem ? renderItem(val) : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
