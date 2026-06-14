'use client';

import { useState, useEffect } from 'react';
import DraggableFloating from './DraggableFloating';

export interface LogEntry {
  id: string;
  text: string;
  normalized?: string;
  result: string;
  status: 'success' | 'fail' | 'unknown' | 'mock';
  time: number;
}

let commandLogs: LogEntry[] = [];
let listeners: (() => void)[] = [];

export function addCommandLog(
  text: string,
  result: string,
  options?: { normalized?: string; status?: LogEntry['status'] }
) {
  const status: LogEntry['status'] = options?.status ||
    (result.includes('预置场景') || result.includes('已绘制') ? 'mock' :
     result.includes('已') || result.includes('画布') ? 'success' :
     result.includes('暂不支持') || result.includes('无法') ? 'fail' : 'unknown');

  commandLogs = [
    {
      id: Date.now().toString(),
      text,
      normalized: options?.normalized || text,
      result,
      status,
      time: Date.now()
    },
    ...commandLogs
  ].slice(0, 50);
  listeners.forEach((l) => l());
  return result;
}

const STATUS_TAGS: Record<LogEntry['status'], { label: string; className: string }> = {
  success: { label: '成功', className: 'bg-accent-emerald/20 text-accent-emerald' },
  fail: { label: '失败', className: 'bg-red-400/20 text-red-400' },
  unknown: { label: '未知', className: 'bg-accent-amber/20 text-accent-amber' },
  mock: { label: 'Mock', className: 'bg-accent-primary/20 text-accent-primary' },
};

export default function CommandLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(commandLogs);

  useEffect(() => {
    const fn = () => setLogs([...commandLogs]);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  // 最近 5 条记录
  const recentLogs = logs.slice(0, 5);

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
          <span>指令记录</span>
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
                <h2 className="font-display font-semibold text-warm-light">语音指令记录</h2>
                <p className="text-[10px] text-warm-muted mt-0.5 font-mono">
                  最近 {recentLogs.length} 条 · 共 {logs.length} 条
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

            {/* Voice tips */}
            <div className="px-4 py-3 border-b border-white/5 bg-surface-elevated/30">
              <p className="text-[10px] text-warm-muted leading-relaxed">
                请使用<strong className="text-warm-light">普通话</strong>靠近麦克风说话。
                推荐说法：
                <span className="text-accent-primary">画一个红色圆形</span>、
                <span className="text-accent-primary">画一棵树</span>、
                <span className="text-accent-primary">画一个房子</span>。
                识别错误时直接再说一遍即可。
              </p>
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
                  <p className="text-[10px] opacity-60">点击右下角麦克风开始</p>
                </div>
              )}

              {logs.map((l, i) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl bg-surface-elevated/60 border border-white/5 hover:border-white/10 transition-all duration-150 animate-slide-up"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-warm-dark">
                      {new Date(l.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_TAGS[l.status].className}`}>
                      {STATUS_TAGS[l.status].label}
                    </span>
                  </div>

                  {/* 原始识别文本 */}
                  <p className="text-xs text-warm-light font-medium leading-relaxed">
                    识别：&ldquo;{l.text}&rdquo;
                  </p>

                  {/* 归一化文本（如果和原始不同） */}
                  {l.normalized && l.normalized !== l.text && (
                    <p className="text-[10px] text-accent-amber/80 mt-0.5 font-mono">
                      归一化：{l.normalized}
                    </p>
                  )}

                  {/* 解析结果 */}
                  <p className={`text-[11px] mt-1 leading-relaxed ${
                    l.status === 'fail' ? 'text-red-300/80' :
                    l.status === 'mock' ? 'text-accent-primary/80' :
                    'text-warm-muted'
                  }`}>
                    {l.result}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-white/6">
              <p className="text-[10px] text-warm-dark text-center">
                点击面板外关闭 · 最多保留 50 条 · 支持语音提示
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
