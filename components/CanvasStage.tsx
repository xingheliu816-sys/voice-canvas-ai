'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { setStageGetter } from '@/lib/canvas/CommandExecutor';
import ShapeRenderer from './shapes/ShapeRenderer';

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_SPEED = 1.08;
const PAN_STEP = 60;

const BG_PRESETS = [
  { label: '白', color: '#fafaf8' },
  { label: '米', color: '#f5f0e0' },
  { label: '灰', color: '#e5e5e0' },
  { label: '黄', color: '#fffde0' },
  { label: '蓝', color: '#e8f0ff' },
  { label: '绿', color: '#e8faf0' },
  { label: '粉', color: '#ffe8f0' },
  { label: '黑', color: '#2a2a2a' },
];

export default function CanvasStage() {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const canvasBackground = useCanvasStore((s) => s.canvasBackground);
  const setCanvasBackground = useCanvasStore((s) => s.setCanvasBackground);
  const stageRef = useRef<Konva.Stage>(null);

  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [stageScale, setStageScale] = useState(1);
  const scaleRef = useRef(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showBgPicker, setShowBgPicker] = useState(false);
  // 按住 Space 进入平移模式（避免与图形拖拽冲突，且让图形可被点击/拖动）
  const [panMode, setPanMode] = useState(false);

  const setScale = useCallback((s: number | ((prev: number) => number)) => {
    const val = typeof s === 'function' ? s(scaleRef.current) : s;
    scaleRef.current = val;
    setStageScale(val);
  }, []);

  const zoomIn = useCallback(
    () => setScale((prev) => Math.min(MAX_SCALE, prev * 1.25)),
    [setScale],
  );
  const zoomOut = useCallback(
    () => setScale((prev) => Math.max(MIN_SCALE, prev / 1.25)),
    [setScale],
  );
  const resetView = useCallback(() => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  }, [setScale]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    [],
  );

  useEffect(() => {
    setStageGetter(() => stageRef.current);
  }, []);

  useEffect(() => {
    function resize() {
      setDims({ w: window.innerWidth - 32, h: window.innerHeight - 112 });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── 键盘快捷键 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 在输入框中不触发画布快捷键
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        resetView();
        return;
      }
      // Space 按下 → 进入平移模式
      if (!mod && e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setPanMode(true);
        return;
      }
      if (!mod) {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); panBy( PAN_STEP, 0); }
        if (e.key === 'ArrowRight') { e.preventDefault(); panBy(-PAN_STEP, 0); }
        if (e.key === 'ArrowUp')    { e.preventDefault(); panBy(0,  PAN_STEP); }
        if (e.key === 'ArrowDown')  { e.preventDefault(); panBy(0, -PAN_STEP); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setPanMode(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [zoomIn, zoomOut, resetView, panBy]);

  // ── 滚轮缩放 ──
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale =
        direction > 0
          ? Math.max(MIN_SCALE, oldScale / ZOOM_SPEED)
          : Math.min(MAX_SCALE, oldScale * ZOOM_SPEED);

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      setScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [],
  );

  // 暴露给外部（语音 CommandExecutor 调用）
  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      (stage as any).__zoomApi = {
        resetView,
        getScale: () => scaleRef.current,
        zoomIn,
        zoomOut,
      };
    }
  }, [resetView, zoomIn, zoomOut]);

  // ── btn 通用样式 ──
  const btnCls =
    'w-7 h-7 flex items-center justify-center rounded text-xs font-mono ' +
    'bg-surface-elevated/70 text-warm-muted border border-white/8 ' +
    'hover:text-warm-light hover:border-white/15 transition-colors';

  return (
    <div className="w-full flex items-center justify-center">
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/[0.06]"
        style={{ cursor: panMode ? 'grab' : 'default' }}
      >
        <Stage
          ref={stageRef}
          width={dims.w}
          height={dims.h}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={panMode}
          onDragEnd={(e) => {
            // 同步平移位置到 React 状态
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onWheel={handleWheel}
          style={{ background: canvasBackground }}
        >
          <Layer>
            {objects.map((obj) => (
              <ShapeRenderer
                key={obj.id}
                obj={obj}
                isSelected={obj.id === selectedId}
                onSelect={() => selectObject(obj.id)}
              />
            ))}
          </Layer>
        </Stage>

        {/* Empty state */}
        {objects.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <svg className="w-16 h-16 text-warm-dark/15 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <p className="text-warm-dark/20 text-sm font-medium">点击右上角麦克风，用语音开始创作</p>
            <p className="text-warm-dark/10 text-xs mt-1">试试说 &ldquo;画一个红色的圆&rdquo;</p>
          </div>
        )}

        {/* ── 缩放控制按钮（右下）── */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 select-none">
          <button onClick={zoomOut} className={btnCls} title="缩小 (Ctrl+−)">&minus;</button>
          <span className="text-[10px] font-mono text-warm-dark/50 min-w-[36px] text-center tabular-nums">
            {Math.round(stageScale * 100)}%
          </span>
          <button onClick={zoomIn} className={btnCls} title="放大 (Ctrl++)">+</button>
          <button onClick={resetView} className={btnCls} title="重置 (Ctrl+0)">1:1</button>
        </div>

        {/* ── 背景色快捷选择（左下）── */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 select-none">
          <button
            onClick={() => setShowBgPicker(!showBgPicker)}
            className={btnCls}
            title="画布背景色"
          >
            <span
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ background: canvasBackground }}
            />
          </button>

          {showBgPicker && (
            <div className="flex items-center gap-1 bg-surface-base/90 backdrop-blur-md rounded-lg px-1.5 py-1 border border-white/10 animate-scale-in">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => { setCanvasBackground(p.color); setShowBgPicker(false); }}
                  className="w-5 h-5 rounded-full border transition-transform hover:scale-125"
                  style={{
                    background: p.color,
                    borderColor: canvasBackground === p.color ? '#5b9cf5' : 'rgba(255,255,255,0.15)',
                    boxShadow: canvasBackground === p.color ? '0 0 0 1px #5b9cf5' : undefined,
                  }}
                  title={p.label}
                />
              ))}
            </div>
          )}
        </div>

        {/* 快捷键提示 */}
        <div className="absolute bottom-12 left-3 pointer-events-none">
          <span className="text-[9px] text-warm-dark/25 hidden lg:block">
            滚轮缩放 · 方向键平移 · 按住 Space 拖拽画布 · Ctrl+0 还原
          </span>
        </div>
      </div>
    </div>
  );
}
