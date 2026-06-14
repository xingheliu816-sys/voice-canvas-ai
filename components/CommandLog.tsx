'use client';

import { useState, useEffect } from 'react';
import DraggableFloating from './DraggableFloating';

interface LogEntry {
  id: string;
  text: string;
  result: string;
  time: number;
}

let commandLogs: LogEntry[] = [];
let listeners: (() => void)[] = [];

export function addCommandLog(text: string, result: string) {
  commandLogs = [{ id: Date.now().toString(), text, result, time: Date.now() }, ...commandLogs].slice(0, 50);
  listeners.forEach((l) => l());
  return result;
}

export default function CommandLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(commandLogs);

  useEffect(() => {
    const fn = () => setLogs([...commandLogs]);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <>
      {/* Trigger — 可拖拽悬浮按钮 */}
      <DraggableFloating
        storageKey="voice-canvas-history-position"
        defaultPosition={{ x: 24, y: 24 }}
        className="z-50"
      >
        <button
          onClick={() => setOpen(!open)}
          className="px-3.5 py-2 rounded-full glass-light text-xs font-medium text-warm-muted hover:text-warm-light hover:border-white/15 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="17 8 21 12 17 16" />
            <polyline points="3 12 21 12" />
            <polyline points="7 8 3 12 7 16" />
          </svg>
          <span>历史</span>
          {logs.length > 0 && (
            <span className="bg-accent-primary/20 text-accent-primary text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center">
              {logs.length}
            </span>
          )}
        </button>
      </DraggableFloating>

      {/* Sidebar */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="
            fixed inset-y-0 left-0 z-[100] w-80
            bg-surface-base/95 backdrop-blur-2xl
            border-r border-white/8
            shadow-2xl
            animate-slide-in-right
            overflow-hidden flex flex-col
          ">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <div>
                <h2 className="font-display font-semibold text-warm-light">指令历史</h2>
                <p className="text-[10px] text-warm-muted mt-0.5 font-mono">
                  最近 {logs.length} 条记录
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-warm-muted hover:text-warm-light transition-colors p-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-warm-muted gap-2">
                  <svg className="w-8 h-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="9" y="1" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                  </svg>
                  <p className="text-xs">还没有语音指令</p>
                  <p className="text-[10px] opacity-60">点击右上角麦克风开始</p>
                </div>
              )}

              {logs.map((l, i) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-surface-elevated/60 border border-white/5 hover:border-white/10 transition-all duration-150 animate-slide-up"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-warm-dark">
                      {new Date(l.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-warm-light font-medium leading-relaxed">
                    &ldquo;{l.text}&rdquo;
                  </p>
                  <p className="text-[11px] text-warm-muted mt-1 leading-relaxed">
                    {l.result}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-white/6">
              <p className="text-[10px] text-warm-dark text-center">
                点击面板外关闭 · 最多保留 50 条
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
