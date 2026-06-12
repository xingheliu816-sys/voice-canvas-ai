'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import MicButton from '@/components/MicButton';
import StatusBar from '@/components/StatusBar';
import HelpOverlay from '@/components/HelpOverlay';
import CommandLogPanel from '@/components/CommandLog';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { setCurrentDrawingId } from '@/lib/nlu/Pipeline';

const CanvasStage = dynamic(() => import('@/components/CanvasStage'), { ssr: false });

export default function CanvasStageWrapper() {
  const status = useVoiceStore((s) => s.status);
  const transcript = useVoiceStore((s) => s.transcript);
  const finalText = useVoiceStore((s) => s.finalText);
  const error = useVoiceStore((s) => s.error);
  const browserSupported = useVoiceStore((s) => s.browserSupported);

  // 从作品列表跳转过来时加载作品
  useEffect(() => {
    const raw = sessionStorage.getItem('load_drawing');
    if (!raw) return;
    try {
      const detail = JSON.parse(raw);
      const objects = JSON.parse(detail.canvas_json);
      useCanvasStore.getState().setObjects(objects);
      setCurrentDrawingId(detail.id);
    } catch {}
    sessionStorage.removeItem('load_drawing');
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <MicButton />
      <CommandLogPanel />
      <HelpOverlay />
      {!browserSupported && (
        <div className="fixed top-4 left-4 z-50 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 max-w-xs ml-20">
          建议使用 Chrome 或 Edge 浏览器以获得完整语音体验
        </div>
      )}
      <div className="flex-1 relative">
        <CanvasStage />
      </div>
      <StatusBar
        status={status}
        text={error || transcript || (finalText ? finalText : undefined)}
      />
    </main>
  );
}
