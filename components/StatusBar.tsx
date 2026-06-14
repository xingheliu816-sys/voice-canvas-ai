'use client';

import type { VoiceStatus } from '@/lib/voice/useVoiceStore';

interface StatusBarProps {
  text?: string;
  status?: VoiceStatus;
}

const STATUS_CONFIG: Record<VoiceStatus, {
  dot: string;
  border: string;
  glow: string;
  label: string;
  hint: string;
}> = {
  idle: {
    dot: 'bg-warm-dark',
    border: 'border-white/[0.04]',
    glow: '',
    label: '就绪 — 点击右下角麦克风开始绘图',
    hint: '说"画一个红色圆形"、"画一棵树"等',
  },
  listening: {
    dot: 'bg-accent-primary',
    border: 'border-accent-primary/20',
    glow: 'shadow-[0_-4px_24px_rgba(255,92,60,0.1)]',
    label: '正在聆听你的声音…',
    hint: '请用普通话说出绘图指令',
  },
  processing: {
    dot: 'bg-accent-amber',
    border: 'border-accent-amber/20',
    glow: 'shadow-[0_-4px_24px_rgba(251,191,36,0.08)]',
    label: '正在识别语音…',
    hint: 'AI 正在解析…',
  },
  executing: {
    dot: 'bg-accent-emerald',
    border: 'border-accent-emerald/20',
    glow: 'shadow-[0_-4px_24px_rgba(52,211,153,0.08)]',
    label: '正在执行指令…',
    hint: '即将继续监听',
  },
  confirming: {
    dot: 'bg-amber-500',
    border: 'border-amber-500/20',
    glow: 'shadow-[0_-4px_24px_rgba(245,158,11,0.12)]',
    label: '等待确认…',
    hint: '请说"确认"或忽略以取消',
  },
  paused: {
    dot: 'bg-warm-dark',
    border: 'border-white/[0.04]',
    glow: '',
    label: '语音监听已暂停',
    hint: '点击"继续讲话"恢复',
  },
  error: {
    dot: 'bg-red-400',
    border: 'border-red-400/20',
    glow: 'shadow-[0_-4px_24px_rgba(248,113,113,0.1)]',
    label: '出现错误',
    hint: '请点击麦克风按钮重试',
  },
};

export default function StatusBar({ text, status = 'idle' }: StatusBarProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-30
      glass border-t ${cfg.border}
      px-5 py-3 text-sm
      transition-all duration-300
      ${cfg.glow}
    `}>
      <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
        {/* Status dot */}
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot}`} />
          {(status === 'listening' || status === 'processing' || status === 'executing' || status === 'confirming') && (
            <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} animate-pulse-ring opacity-75`} />
          )}
        </span>

        {/* Status text */}
        <span className="font-mono text-xs tracking-wide text-warm-muted">
          {text || cfg.label}
        </span>

        {/* Right side hint */}
        <span className="ml-auto text-[10px] text-warm-dark hidden sm:block">
          {cfg.hint}
        </span>
      </div>
    </div>
  );
}
