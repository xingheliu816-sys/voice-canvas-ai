'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Group, Text as KText, Rect as KRect } from 'react-konva';
import Konva from 'konva';
import {
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
  useCanvasStore,
  getProjectSnapshot
} from '@/lib/canvas/ObjectStore';
import { setStageGetter, setViewportSizeGetter } from '@/lib/canvas/CommandExecutor';
import ShapeRenderer from './shapes/ShapeRenderer';
import { updateDrawing } from '@/lib/api/drawings-client';
import { getCurrentDrawingId, setCurrentDrawingId } from '@/lib/nlu/Pipeline';
import { triggerHelp } from './HelpOverlay';

const ZOOM_STEP_FACTOR = 1.1;
const WHEEL_FACTOR = 1.08;

const BG_PRESETS = [
  { label: '白', color: '#fafaf8' },
  { label: '米', color: '#f5f0e0' },
  { label: '灰', color: '#e5e5e0' },
  { label: '黄', color: '#fffde0' },
  { label: '蓝', color: '#e8f0ff' },
  { label: '绿', color: '#e8faf0' },
  { label: '粉', color: '#ffe8f0' },
  { label: '黑', color: '#2a2a2a' }
];

const COLOR_PRESETS = [
  '#111827', '#ef4444', '#f97316', '#facc15', '#22c55e',
  '#0ea5e9', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'
];

export default function CanvasStage({
  isFullscreen = false,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateObject = useCanvasStore((s) => s.updateObject);
  const removeObject = useCanvasStore((s) => s.removeObject);
  const canvases = useCanvasStore((s) => s.canvases);
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId);
  const canvasBackground = useCanvasStore((s) => s.canvasBackground);
  const setCanvasBackground = useCanvasStore((s) => s.setCanvasBackground);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const zoomBy = useCanvasStore((s) => s.zoomBy);
  const zoomTo = useCanvasStore((s) => s.zoomTo);
  const resetView = useCanvasStore((s) => s.resetView);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseVX: number; baseVY: number } | null>(null);

  const [dims, setDims] = useState({ w: 1200, h: 720 });
  const [isPanning, setIsPanning] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const activeCanvasName = canvases.find((c) => c.id === activeCanvasId)?.name || '画布 1';

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const currentId = getCurrentDrawingId();
      if (currentId) {
        const canvasJson = JSON.stringify(getProjectSnapshot());
        await updateDrawing(currentId, { canvasJson });
        setSaveMsg('已保存');
      } else {
        setSaveMsg('请先命名保存');
      }
    } catch {
      setSaveMsg('保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }, []);

  // 注册 Stage / viewport size 给 CommandExecutor
  useEffect(() => {
    setStageGetter(() => stageRef.current);
    setViewportSizeGetter(() => ({ width: dims.w, height: dims.h }));
  }, [dims.w, dims.h]);

  // 自适应窗口尺寸
  useEffect(() => {
    function resize() {
      const padding = 32;
      const headerOffset = 164; // header(48) + tabs(44) + padding(32) + statusBar(40)
      setDims({
        w: Math.max(320, window.innerWidth - padding),
        h: Math.max(320, window.innerHeight - headerOffset)
      });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── 键盘快捷键 Ctrl+/-/0、方向键 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (editable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const state = useCanvasStore.getState();
        if (state.selectedId) {
          state.removeObject(state.selectedId);
        }
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomBy(ZOOM_STEP_FACTOR, { x: dims.w / 2, y: dims.h / 2 });
        return;
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        zoomBy(1 / ZOOM_STEP_FACTOR, { x: dims.w / 2, y: dims.h / 2 });
        return;
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        resetView();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomBy, resetView, dims.w, dims.h]);

  // ── 滚轮缩放（以鼠标当前位置为中心）──
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
      zoomBy(factor, pointer);
    },
    [zoomBy]
  );

  // ── 鼠标左键拖动空白处平移画布 ──
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      // 点中了图形/编号 → 不进入画布平移
      if (e.target !== stageRef.current) return;
      selectObject(null);
      dragRef.current = {
        startX: e.evt.clientX,
        startY: e.evt.clientY,
        baseVX: viewport.x,
        baseVY: viewport.y
      };
      setIsPanning(true);
    },
    [selectObject, viewport.x, viewport.y]
  );

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      setViewport({ x: drag.baseVX + dx, y: drag.baseVY + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning, setViewport]);

  const btnCls =
    'h-7 px-2 flex items-center justify-center rounded text-xs font-mono ' +
    'bg-surface-elevated/70 text-warm-muted border border-white/8 ' +
    'hover:text-warm-light hover:border-white/15 transition-colors';

  const percent = Math.round((viewport.scale || 1) * 100);
  const minPct = Math.round(MIN_CANVAS_SCALE * 100);
  const maxPct = Math.round(MAX_CANVAS_SCALE * 100);

  return (
    <div className="w-full flex items-center justify-center">
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/[0.06]"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <Stage
          ref={stageRef}
          width={dims.w}
          height={dims.h}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onTouchStart={(e) => {
            if (e.target === stageRef.current) selectObject(null);
          }}
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
          {/* 编号标签层：仅选中图形显示编号，导出时整体隐藏 */}
          <Layer name="shape-number-layer" listening={false}>
            {objects.map((obj) => {
              // 仅选中的图形显示编号
              const isSelected = obj.id === selectedId;
              if (!isSelected) return null;

              const isCenterAnchored = obj.shape === 'circle' || obj.shape === 'triangle' || obj.shape === 'polygon';
              const halfW = obj.width / 2;
              const halfH = obj.height / 2;
              const baseX = isCenterAnchored ? obj.x + halfW : obj.x + obj.width;
              const baseY = isCenterAnchored ? obj.y - halfH : obj.y;
              const labelText = `#${obj.number}`;
              const padX = 4;
              const padY = 2;
              const fontSize = 12;
              const w = labelText.length * (fontSize - 2) + padX * 2;
              const h = fontSize + padY * 2;
              return (
                <Group key={obj.id + '_lbl'} x={baseX + 4} y={baseY - h - 2}>
                  <KRect
                    width={w}
                    height={h}
                    cornerRadius={10}
                    fill="rgba(17,24,39,0.85)"
                  />
                  <KText
                    text={labelText}
                    fontSize={fontSize}
                    width={w}
                    align="center"
                    y={3}
                    fill="#fff"
                    fontStyle="bold"
                  />
                </Group>
              );
            })}
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

        {/* ── 画布内悬浮控件层（不挡住空白区域拖拽/平移）── */}
        <div className="pointer-events-none absolute inset-0 z-50">
          {/* ── 左下角：画布背景 / 图形颜色 / 保存 / 画布名 ── */}
          <div className="absolute left-4 bottom-16 flex flex-col gap-2 pointer-events-auto select-none">
            {/* 画布背景 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowBgPicker((v) => !v); setShowColorPicker(false); }}
                className={btnCls}
                title="修改画布背景"
              >
                <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: canvasBackground }} />
                <span className="ml-1 text-[10px]">背景</span>
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
                        boxShadow: canvasBackground === p.color ? '0 0 0 1px #5b9cf5' : undefined
                      }}
                      title={p.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 图形颜色 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowColorPicker((v) => !v); setShowBgPicker(false); }}
                className={btnCls}
                title="修改选中图形颜色"
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{ background: selectedId ? (objects.find((o) => o.id === selectedId)?.fill ?? '#fff') : 'transparent' }}
                />
                <span className="ml-1 text-[10px]">图形</span>
              </button>
              {showColorPicker && (
                <div className="flex items-center gap-1 bg-surface-base/90 backdrop-blur-md rounded-lg px-1.5 py-1 border border-white/10 animate-scale-in">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (selectedId) updateObject(selectedId, { fill: c, stroke: c });
                        setShowColorPicker(false);
                      }}
                      className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-125"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 保存 */}
            <button onClick={handleSave} disabled={saving} className={btnCls} title="保存作品">
              {saving ? (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" /></svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              )}
              <span className="ml-1 text-[10px]">{saveMsg || '保存'}</span>
            </button>

            {/* 画布名称 */}
            <span className="text-[10px] text-warm-muted/60 font-mono pl-1 max-w-[100px] truncate" title={activeCanvasName}>
              {activeCanvasName}
            </span>

            {/* 删除选中图形 */}
            {selectedId && (
              <button
                onClick={() => removeObject(selectedId)}
                className={btnCls + ' text-red-400 hover:text-red-300 hover:border-red-400/30'}
                title="删除选中图形 (Delete)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                <span className="ml-1 text-[10px]">删除</span>
              </button>
            )}
          </div>

          {/* ── 右下角：缩放 / 全屏 / 帮助 ── */}
          <div className="absolute right-4 bottom-16 flex flex-col items-end gap-2 pointer-events-auto select-none">
            <button
              onClick={() => zoomBy(ZOOM_STEP_FACTOR, { x: dims.w / 2, y: dims.h / 2 })}
              className={btnCls}
              title={`放大 (Ctrl++)  最大 ${maxPct}%`}
            >
              +
            </button>
            <button
              onClick={() => zoomTo(1)}
              className="text-[10px] font-mono text-warm-dark/60 hover:text-warm-light min-w-[44px] text-center tabular-nums px-1.5 py-1 rounded transition-colors"
              title="点击重置到 100%"
            >
              {percent}%
            </button>
            <button
              onClick={() => zoomBy(1 / ZOOM_STEP_FACTOR, { x: dims.w / 2, y: dims.h / 2 })}
              className={btnCls}
              title={`缩小 (Ctrl+−)  最小 ${minPct}%`}
            >
              −
            </button>
            <button onClick={resetView} className={btnCls} title="重置视图 (Ctrl+0)">
              1:1
            </button>
            {onToggleFullscreen && (
              <button onClick={onToggleFullscreen} className={btnCls} title={isFullscreen ? '退出全屏 (Esc)' : '全屏'}>
                {isFullscreen ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 8 4 4 8 4" /><polyline points="20 8 20 4 16 4" /><polyline points="4 16 4 20 8 20" /><polyline points="20 16 20 20 16 20" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 4 4 4 4 8" /><polyline points="16 4 20 4 20 8" /><polyline points="8 20 4 20 4 16" /><polyline points="16 20 20 20 20 16" /></svg>
                )}
              </button>
            )}
            <button onClick={triggerHelp} className={btnCls} title="指令帮助 (?)">
              ?
            </button>
          </div>
        </div>

        {/* 提示文字（左下，不遮挡控件） */}
        <div className="absolute bottom-4 left-4 pointer-events-none z-0">
          <span className="text-[9px] text-warm-dark/25 hidden lg:block">
            鼠标左键拖动画布 · 滚轮缩放 · Ctrl + +/− 缩放 · Ctrl+0 还原
          </span>
        </div>
      </div>
    </div>
  );
}
