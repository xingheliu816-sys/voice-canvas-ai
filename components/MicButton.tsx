'use client';

import { useCallback, useRef } from 'react';
import { MicController } from '@/lib/voice/MicController';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { processInput } from '@/lib/nlu/Pipeline';
import { addCommandLog } from '@/components/CommandLog';
import { speak } from '@/lib/voice/Speaker';

export default function MicButton() {
  const status = useVoiceStore((s) => s.status);
  const setStatus = useVoiceStore((s) => s.setStatus);
  const setTranscript = useVoiceStore((s) => s.setTranscript);
  const setFinalText = useVoiceStore((s) => s.setFinalText);
  const setError = useVoiceStore((s) => s.setError);
  const micRef = useRef<MicController | null>(null);

  const handleClick = useCallback(() => {
    if (status === 'listening') return;

    setStatus('listening');
    setTranscript('');
    setFinalText('');

    micRef.current = new MicController({
      onInterim: (text) => setTranscript(text),
      onFinal: async (text) => {
        setFinalText(text);
        setStatus('processing');
        const result = await processInput(text);
        const display = `听到：${text} · ${result}`;
        setFinalText(display);
        addCommandLog(text, result);
        speak(result);
      },
      onError: (err) => setError(err),
      onEnd: () => setStatus('idle')
    });
    micRef.current.start();
  }, [status, setStatus, setTranscript, setFinalText, setError]);

  const isActive = status === 'listening';

  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-md transition-colors ${
        isActive
          ? 'bg-red-500 text-white animate-pulse cursor-not-allowed'
          : 'bg-neutral-900 text-white hover:bg-neutral-700'
      }`}
    >
      <span>{isActive ? '●' : '🎤'}</span>
      {isActive ? '正在听…' : '开始讲话'}
    </button>
  );
}
