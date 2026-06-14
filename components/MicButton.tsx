'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { MicController } from '@/lib/voice/MicController';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { processInput } from '@/lib/nlu/Pipeline';
import { normalize } from '@/lib/nlu/Normalizer';
import { addCommandLog } from '@/components/CommandLog';
import type { LogEntry } from '@/components/CommandLog';
import DraggableFloating from './DraggableFloating';

/** 把执行结果压成画布上方的短提示 */
function briefResult(result: string): string {
  if (/^已新增|^已绘制/.test(result)) return '已作图';
  if (/^已切换/.test(result)) return result;
  if (/^已删除|^已清空|^已替换|^已修改|^已调整|^已移动|^已旋转/.test(result)) return result;
  if (/画布缩放/.test(result)) return result;
  if (/^已/.test(result)) return result;
  return result;
}

export default function MicButton() {
  const status = useVoiceStore((s) => s.status);
  const transcript = useVoiceStore((s) => s.transcript);
  const finalText = useVoiceStore((s) => s.finalText);
  const setStatus = useVoiceStore((s) => s.setStatus);
  const setTranscript = useVoiceStore((s) => s.setTranscript);
  const setFinalText = useVoiceStore((s) => s.setFinalText);
  const setError = useVoiceStore((s) => s.setError);
  const setAutoRestart = useVoiceStore((s) => s.setAutoRestart);
  const setTopMessage = useVoiceStore((s) => s.setTopMessage);
  const micRef = useRef<MicController | null>(null);
  const topMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHints, setShowHints] = useState(false);

  const showTopMessage = useCallback(
    (msg: string, ms = 1000) => {
      if (topMessageTimerRef.current) clearTimeout(topMessageTimerRef.current);
      setTopMessage(msg);
      topMessageTimerRef.current = setTimeout(() => {
        setTopMessage('');
      }, ms);
    },
    [setTopMessage]
  );

  const startListening = useCallback(() => {
    if (micRef.current?.active) return;
    console.log('[Voice] startListening() — user clicked mic button');
    setStatus('listening');
    setTranscript('');
    setFinalText('');
    setError(null);
    setAutoRestart(true);

    micRef.current = new MicController(
      {
        onInterim: (text) => {
          setTranscript(text);
        },
        onFinal: async (text) => {
          setFinalText(text);
          setStatus('processing');
          const normalizedText = normalize(text);
          const result = await processInput(text);
          const display = `${text} · ${result}`;
          setFinalText(display);

          // 判断状态用于日志标记
          const logStatus: LogEntry['status'] =
            result.includes('预置场景') || result.includes('已绘制') ? 'mock' :
            result.includes('已识别') && result.includes('暂不支持') ? 'fail' :
            result.includes('已') || result.includes('画布') ? 'success' : 'unknown';

          addCommandLog(text, result, { normalized: normalizedText, status: logStatus });

          // 在画布上方显示短暂状态：成功就显示"已作图"，否则显示结果摘要
          const store = useVoiceStore.getState();
          if (store.status === 'confirming') {
            showTopMessage(result, 1800);
          } else if (result && !/未找到|未知|无法|失败|请先|请说/.test(result)) {
            showTopMessage(briefResult(result), 1000);
          } else if (result) {
            showTopMessage(result, 1500);
          }

          const shouldRestart =
            store.autoRestart && !['paused', 'confirming'].includes(store.status);
          return shouldRestart;
        },
        onError: (err) => {
          console.warn('[Voice] hard error:', err);
          setError(err);
          showTopMessage(err, 2000);
        },
        onEnd: () => {
          const store = useVoiceStore.getState();
          if (store.autoRestart && !['paused', 'confirming'].includes(store.status)) {
            // 即将自动重启 UI 状态回到 listening
            setTimeout(() => {
              const s = useVoiceStore.getState();
              if (s.autoRestart && !['paused', 'confirming'].includes(s.status)) {
                s.setStatus('listening');
                s.setTranscript('');
              }
            }, 160);
          }
        }
      },
      { silenceMs: 1200, maxDurationMs: 15000, autoRestartMs: 150 }
    );
    micRef.current.start();
  }, [setStatus, setTranscript, setFinalText, setError, setAutoRestart, showTopMessage]);

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

  // 稳定波形条高度
  const waveHeights = useMemo(() => [0, 1, 2, 3].map(() => 6 + Math.random() * 10), []);

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

        {/* 语音转文字实时显示 */}
        {(transcript || finalText) && (
          <div className="max-w-[260px] p-2.5 rounded-xl bg-surface-elevated/80 backdrop-blur-xl border border-white/10 text-xs text-warm-light leading-relaxed animate-fade-in">
            {transcript && status === 'listening' && (
              <span className="text-warm-muted">{transcript}</span>
            )}
            {finalText && (
              <span className="text-warm-light">{finalText}</span>
            )}
          </div>
        )}

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
          onMouseEnter={() => setShowHints(true)}
          onMouseLeave={() => setShowHints(false)}
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

        {/* 语音提示面板 */}
        <div className={`
          max-w-[260px] p-3 rounded-xl bg-surface-elevated/90 backdrop-blur-xl border border-white/8
          text-[10px] text-warm-muted leading-relaxed
          transition-all duration-200
          ${showHints ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none absolute'}
        `}>
          <p className="mb-1.5 text-warm-light font-medium">语音提示：</p>
          <ul className="space-y-1">
            <li>· 请使用<strong className="text-warm-light">普通话</strong>靠近麦克风说话</li>
            <li>· 推荐：<span className="text-accent-primary">画一个红色圆形</span></li>
            <li>· 推荐：<span className="text-accent-primary">画一棵树 / 画房子 / 画太阳</span></li>
            <li>· 识别错误时直接再说一遍即可</li>
          </ul>
        </div>

        <span className="text-xs text-warm-muted pr-2">点击麦克风开始，悬停查看提示</span>
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
