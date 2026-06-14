'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DraggableFloatingProps {
  /** localStorage key 用于持久化位置 */
  storageKey: string;
  /** SSR 回退默认位置，以及无缓存时的初始位置 */
  defaultPosition: Position;
  /** 挂载后动态计算默认位置的函数（仅在无缓存时调用） */
  getDefaultPosition?: () => Position;
  className?: string;
  children: React.ReactNode;
}

interface DragState {
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  moved: boolean;
}

const DRAG_THRESHOLD = 5;
const BOUNDARY = 8;

export default function DraggableFloating({
  storageKey,
  defaultPosition,
  getDefaultPosition,
  className = '',
  children,
}: DraggableFloatingProps) {
  const [pos, setPos] = useState<Position>(defaultPosition);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // ── 边界钳位 ──
  const clampToBounds = useCallback((p: Position): Position => {
    const w = elRef.current?.offsetWidth || 0;
    const h = elRef.current?.offsetHeight || 0;
    return {
      x: Math.min(Math.max(p.x, BOUNDARY), Math.max(BOUNDARY, window.innerWidth - w - BOUNDARY)),
      y: Math.min(Math.max(p.y, BOUNDARY), Math.max(BOUNDARY, window.innerHeight - h - BOUNDARY)),
    };
  }, []);

  // ── 挂载时从 localStorage 恢复位置 ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Position;
        if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          setPos(clampToBounds(saved));
          setMounted(true);
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    // 无缓存时使用动态默认位置
    if (getDefaultPosition) {
      setPos(clampToBounds(getDefaultPosition()));
    }
    setMounted(true);
  }, [storageKey, getDefaultPosition, clampToBounds]);

  // ── 窗口 resize / 组件尺寸变化时重新钳位 ──
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setPos((prev) => clampToBounds(prev));
    window.addEventListener('resize', onResize);

    const ro = new ResizeObserver(() => {
      setPos((prev) => clampToBounds(prev));
    });
    if (elRef.current) ro.observe(elRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [mounted, clampToBounds]);

  // ── 拖拽开始 ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      moved: false,
    };
  }, [pos]);

  // ── 拖拽移动：超过阈值后捕获指针并开始拖拽 ──
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD)) {
      drag.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
    }

    if (drag.moved) {
      setPos(clampToBounds({
        x: drag.startPosX + dx,
        y: drag.startPosY + dy,
      }));
    }
  }, [clampToBounds]);

  // ── 拖拽结束：保存位置或让点击穿透 ──
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (drag?.moved) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);

      // 持久化到 localStorage
      const finalPos = clampToBounds({
        x: drag.startPosX + (e.clientX - drag.startX),
        y: drag.startPosY + (e.clientY - drag.startY),
      });
      setPos(finalPos);
      try {
        localStorage.setItem(storageKey, JSON.stringify(finalPos));
      } catch { /* quota exceeded */ }
    }
    // 如果 moved=false，不阻止事件，让子按钮的 onClick 正常触发
  }, [clampToBounds, storageKey]);

  // ── SSR 阶段用 CSS 定位（与客户端首次渲染一致，避免 hydration 错误）──
  if (!mounted) {
    return (
      <div
        className={`fixed ${className}`}
        style={{ left: defaultPosition.x, top: defaultPosition.y }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={elRef}
      className={`fixed select-none ${className}`}
      style={{
        left: pos.x,
        top: pos.y,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: dragging ? 200 : undefined,
        transition: dragging ? 'none' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  );
}
