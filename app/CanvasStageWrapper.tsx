'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MicButton from '@/components/MicButton';
import StatusBar from '@/components/StatusBar';
import HelpOverlay from '@/components/HelpOverlay';
import CommandLogPanel from '@/components/CommandLog';
import AccountMenu from '@/components/AccountMenu';
import SaveButton from '@/components/SaveButton';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { normalizeDrawingProject, useCanvasStore } from '@/lib/canvas/ObjectStore';
import { setCurrentDrawingId } from '@/lib/nlu/Pipeline';
import CanvasTabs from '@/components/CanvasTabs';

const CanvasStage = dynamic(() => import('@/components/CanvasStage'), { ssr: false });

export default function CanvasStageWrapper() {
  const status = useVoiceStore((s) => s.status);
  const transcript = useVoiceStore((s) => s.transcript);
  const finalText = useVoiceStore((s) => s.finalText);
  const error = useVoiceStore((s) => s.error);
  const topMessage = useVoiceStore((s) => s.topMessage);
  const browserSupported = useVoiceStore((s) => s.browserSupported);

  const canvasShellRef = useRef<HTMLDivElement>(null);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);

  // ── 全屏状态监听 ──
  useEffect(() => {
    const handler = () => {
      setIsCanvasFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      canvasShellRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    useVoiceStore.getState().setBrowserSupported(supported);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('load_drawing');
    if (!raw) return;
    try {
      const detail = JSON.parse(raw);
      const payload = JSON.parse(detail.canvas_json);
      useCanvasStore.getState().loadProject(normalizeDrawingProject(payload, detail.title));
      setCurrentDrawingId(detail.id);
    } catch {}
    sessionStorage.removeItem('load_drawing');
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-surface-deep">
      {/* Top bar — 全屏时隐藏 */}
      {!isCanvasFullscreen && (
        <header className="h-12 flex items-center px-5 border-b border-white/[0.04] shrink-0">
          <span className="font-display text-base font-semibold text-warm-light tracking-tight">
            Voice Canvas
          </span>
          <span className="ml-2.5 text-[10px] font-mono text-warm-dark bg-surface-elevated px-1.5 py-0.5 rounded">
            BETA
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-warm-muted hidden sm:block">语音控制绘图工具</span>
            <SaveButton />
            <AccountMenu />
          </span>
        </header>
      )}

      {/* Browser warning — 全屏时隐藏 */}
      {!browserSupported && !isCanvasFullscreen && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-xs text-accent-amber/90 max-w-lg animate-slide-up">
          建议使用 Chrome 或 Edge 浏览器以获得完整语音体验
        </div>
      )}

      {/* ── 画布全屏容器 ── */}
      <div
        ref={canvasShellRef}
        className="canvas-shell relative flex-1 flex flex-col bg-surface-deep"
      >
        {/* Canvas tabs — 全屏时隐藏 */}
        <div className="px-4 pt-3">
          {!isCanvasFullscreen && <CanvasTabs />}
        </div>

        {/* 画布上方短暂状态提示 */}
        {topMessage && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-4 z-60 px-4 py-1.5 rounded-full bg-surface-elevated/90 border border-white/10 backdrop-blur-md text-xs text-warm-light shadow-lg shadow-black/30 animate-fade-in"
            role="status"
          >
            {topMessage}
          </div>
        )}

        {/* Canvas stage — 填充剩余空间 */}
        <div className="flex-1 relative px-4 pb-2">
          <CanvasStage
            isFullscreen={isCanvasFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        {/* 开始讲话组件 — 悬浮固定定位，全屏时仍在画布上方可见 */}
        <MicButton />

        {/* 指令记录 — 全屏时隐藏 */}
        {!isCanvasFullscreen && <CommandLogPanel />}

        {/* 帮助面板 — 通过 CanvasStage 右侧 ? 按钮触发 */}
        <HelpOverlay />

        {/* 状态栏 — 始终可见 */}
        <StatusBar
          status={status}
          text={topMessage || error || transcript || (finalText ? finalText : undefined)}
        />
      </div>
    </main>
  );
}
