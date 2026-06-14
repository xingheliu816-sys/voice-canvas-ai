'use client';

import { useCallback, useMemo, useRef } from 'react';
import { MicController } from '@/lib/voice/MicController';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { processInput } from '@/lib/nlu/Pipeline';
import { addCommandLog } from '@/components/CommandLog';
import { speak } from '@/lib/voice/Speaker';
import DraggableFloating from './DraggableFloating';

export default function MicButton() {
  const status = useVoiceStore((s) => s.status);
  const setStatus = useVoiceStore((s) => s.setStatus);
  const setTranscript = useVoiceStore((s) => s.setTranscript);
  const setFinalText = useVoiceStore((s) => s.setFinalText);
  const setError = useVoiceStore((s) => s.setError);
  const setAutoRestart = useVoiceStore((s) => s.setAutoRestart);
  const micRef = useRef<MicController | null>(null);

  const startListening = useCallback(() => {
    if (micRef.current?.active) return;
    console.log('[Voice] startListening() — user clicked mic button');
    setStatus('listening');
    setTranscript('');
    setFinalText('');
    setAutoRestart(true);

    micRef.current = new MicController(
      {
        onInterim: (text) => {
          console.log('[Voice] interim:', text);
          setTranscript(text);
        },
        onFinal: async (text) => {
          console.log('[Voice] final:', text);
          setFinalText(text);
          setStatus('processing');
          const result = await processInput(text);
          console.log('[Voice] processInput result:', result);
          const display = `${text} · ${result}`;
          setFinalText(display);
          addCommandLog(text, result);
          speak(result);

          // 检查是否应该自动重启
          const store = useVoiceStore.getState();
          const shouldRestart = store.autoRestart && !['paused', 'confirming', 'error'].includes(store.status);
          return shouldRestart;
        },
        onError: (err) => {
          console.error('[Voice] error:', err);
          setError(err);
        },
        onEnd: () => {
          console.log('[Voice] onEnd');
          const store = useVoiceStore.getState();
          if (store.autoRestart && !['paused', 'confirming', 'error'].includes(store.status)) {
            // 即将自动重启，延迟更新 UI 状态以匹配 autoRestartMs(400)
            setTimeout(() => {
              const s = useVoiceStore.getState();
              if (s.autoRestart && !['paused', 'confirming', 'error'].includes(s.status)) {
                s.setStatus('listening');
                s.setTranscript('');
              }
            }, 450);
          }
        },
      },
      { silenceMs: 1300, maxDurationMs: 15000, autoRestartMs: 400 },
    );
    micRef.current.start();
  }, [setStatus, setTranscript, setFinalText, setError, setAutoRestart]);

  const handleResume = useCallback(() => {
    setAutoRestart(true);
    if (micRef.current) {
      micRef.current.resume();
    } else {
      startListening();
    }
    setStatus('listening');
  }, [setAutoRestart, setStatus, startListening]);

  const handleStop = useCallback(() => {
    if (micRef.current) {
      micRef.current.stop();
    }
    setAutoRestart(false);
    setStatus('idle');
  }, [setAutoRestart, setStatus]);

  // 稳定的波形条高度，避免 Math.random() 在每次渲染时抖动
  const waveHeights = useMemo(
    () => [0, 1, 2, 3].map(() => 6 + Math.random() * 10),
    [],
  );

  // ── 根据 status 渲染不同的内容 ──

  let content: React.ReactNode;

  if (status === 'paused') {
    content = (
      <div className="flex flex-col items-end gap-2 animate-fade-in">
        <button
          onClick={handleResume}
          className="relative flex items-center gap-3 px-5 py-3 rounded-full font-medium text-sm
            bg-accent-emerald/90 text-white shadow-[0_0_24px_rgba(52,211,153,0.25)]
            hover:bg-accent-emerald transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          继续讲话
        </button>
        <span className="text-xs text-warm-muted pr-2">语音监听已暂停</span>
      </div>
    );
  } else if (status === 'listening' || status === 'processing' || status === 'executing' || status === 'confirming') {
    content = (
      <div className="flex flex-col items-end gap-2">
        {/* 主状态指示 */}
        <div className={`
          glow-ring flex items-center gap-3 px-5 py-3 rounded-full font-medium text-sm
          transition-all duration-300
          ${status === 'listening' ? 'active' : ''}
        `}>
          <span className={`
            absolute inset-0 rounded-full
            ${status === 'listening' ? 'bg-accent-primary/90 shadow-[0_0_32px_rgba(255,92,60,0.3)]' : ''}
            ${status === 'processing' ? 'bg-accent-amber/90 shadow-[0_0_24px_rgba(251,191,36,0.2)]' : ''}
            ${status === 'executing' ? 'bg-accent-emerald/90 shadow-[0_0_24px_rgba(52,211,153,0.2)]' : ''}
            ${status === 'confirming' ? 'bg-amber-500/90 shadow-[0_0_24px_rgba(245,158,11,0.3)]' : ''}
          `} />

          {/* Icon */}
          <span className={`
            relative flex items-center justify-center w-8 h-8 rounded-full
            ${status === 'listening' ? 'bg-white/20' : 'bg-white/20'}
          `}>
            {status === 'listening' && (
              <span className="flex items-center gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[2px] bg-white rounded-full"
                    style={{
                      height: `${waveHeights[i]}px`,
                      animation: `wave ${0.4 + i * 0.12}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </span>
            )}
            {status === 'processing' && (
              <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            )}
            {status === 'executing' && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {status === 'confirming' && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>

          {/* Label */}
          <span className="relative text-sm font-semibold text-white">
            {status === 'listening' && '正在聆听…'}
            {status === 'processing' && '正在识别…'}
            {status === 'executing' && '正在绘制…'}
            {status === 'confirming' && '请确认…'}
          </span>
        </div>

        {/* 应急停止按钮 */}
        <button
          onClick={handleStop}
          className="px-3 py-1.5 rounded-full text-[11px] font-medium
            bg-surface-elevated/60 text-warm-muted border border-white/8
            hover:text-red-400 hover:border-red-400/30 transition-all duration-150"
        >
          停止
        </button>
      </div>
    );
  } else if (status === 'error') {
    content = (
      <div className="flex flex-col items-end gap-2 animate-fade-in">
        <button
          onClick={startListening}
          className="relative flex items-center gap-3 px-5 py-3 rounded-full font-medium text-sm
            bg-red-500/90 text-white shadow-[0_0_24px_rgba(239,68,68,0.2)]
            hover:bg-red-500 transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          重新开始
        </button>
      </div>
    );
  } else {
    // idle
    content = (
      <div className="flex flex-col items-end gap-2 animate-slide-in-right">
        <button
          onClick={startListening}
          className="group relative flex items-center gap-3 px-5 py-3 rounded-full font-medium text-sm
            bg-surface-elevated/80 backdrop-blur-xl border border-white/10
            hover:bg-surface-overlay/80 hover:border-white/15
            transition-all duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-primary/10">
            <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-warm-light">开始讲话</span>
        </button>
        <span className="text-xs text-warm-muted pr-2">点击后说出绘图指令</span>
      </div>
    );
  }

  // 动态默认位置：靠右侧，匹配原 right-6 定位
  const getSpeechDefaultPos = useCallback(
    () => ({ x: window.innerWidth - 220, y: 24 }),
    [],
  );

  return (
    <DraggableFloating
      storageKey="voice-canvas-speech-position"
      defaultPosition={{ x: 0, y: 24 }}
      getDefaultPosition={getSpeechDefaultPos}
      className="z-50"
    >
      {content}
    </DraggableFloating>
  );
}
