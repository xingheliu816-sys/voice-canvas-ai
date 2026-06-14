'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import MicButton from '@/components/MicButton';
import StatusBar from '@/components/StatusBar';
import HelpOverlay from '@/components/HelpOverlay';
import CommandLogPanel from '@/components/CommandLog';
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
  const browserSupported = useVoiceStore((s) => s.browserSupported);

  // 客户端挂载后检测浏览器是否真正支持语音识别（避免 SSR hydration 不匹配）
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
      {/* Top bar */}
      <header className="h-12 flex items-center px-5 border-b border-white/[0.04] shrink-0">
        <span className="font-display text-base font-semibold text-warm-light tracking-tight">
          Voice Canvas
        </span>
        <span className="ml-2.5 text-[10px] font-mono text-warm-dark bg-surface-elevated px-1.5 py-0.5 rounded">
          BETA
        </span>
        <span className="ml-auto text-[10px] text-warm-muted hidden sm:block">
          语音控制绘图工具
        </span>
      </header>

      {/* Browser warning */}
      {!browserSupported && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-xs text-accent-amber/90 max-w-lg animate-slide-up">
          建议使用 Chrome 或 Edge 浏览器以获得完整语音体验
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 relative p-4">
        <CanvasTabs />
        <CanvasStage />
      </div>

      {/* Floating controls */}
      <MicButton />
      <CommandLogPanel />
      <HelpOverlay />

      {/* Status bar */}
      <StatusBar
        status={status}
        text={error || transcript || (finalText ? finalText : undefined)}
      />
    </main>
  );
}
