'use client';

import { useState, useEffect, useCallback } from 'react';

const HELP_SECTIONS = [
  {
    title: '基础绘图',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    items: ['画一个红色的圆', '画个蓝色矩形', '在左上角画绿三角', '画一条直线', '写你好'],
  },
  {
    title: '样式与位置',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    items: ['画一个大的红圆', '在右下角画小的', '画个0.5透明方块', '在中间画黄三角'],
  },
  {
    title: '编辑操作',
    icon: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
    items: ['选中那个圆', '改成蓝色', '放大一点', '向右移动', '删除'],
  },
  {
    title: '全局操作',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    items: ['撤销', '重做', '清空画布', '导出图片'],
  },
  {
    title: '复杂场景',
    icon: 'M12 3v18M3 12h18',
    items: ['画房子', '画笑脸', '画田园风光', '画雪人', '画彩虹', '画圣诞树', '画太极图'],
  },
  {
    title: '作品管理',
    icon: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
    items: ['保存为我的第一幅画', '保存作品', '打开我的作品', '打开第一幅', '删除这个作品'],
  },
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === '?' && !open) { e.preventDefault(); setOpen(true); }
  }, [open]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-6 z-50 w-9 h-9 rounded-full glass-light flex items-center justify-center text-warm-muted hover:text-warm-light hover:border-white/15 transition-all duration-200 text-sm font-medium"
        title="指令帮助 (按 ? 键)"
      >
        ?
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="
            w-full max-w-xl max-h-[78vh] overflow-y-auto
            bg-surface-base/95 backdrop-blur-2xl
            border border-white/10
            rounded-2xl shadow-2xl
            animate-scale-in
          ">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-surface-base/80 backdrop-blur-xl">
              <div>
                <h2 className="text-lg font-display font-semibold text-warm-light">语音指令速查</h2>
                <p className="text-xs text-warm-muted mt-0.5">试试说出以下指令来控制画布</p>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-warm-muted border border-white/10 font-mono">
                  ESC
                </kbd>
                <button
                  onClick={() => setOpen(false)}
                  className="text-warm-muted hover:text-warm-light transition-colors text-xl leading-none p-1"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Sections */}
            <div className="p-6 space-y-5">
              {HELP_SECTIONS.map((s, i) => (
                <div
                  key={s.title}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <h3 className="text-xs font-semibold text-accent-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={s.icon} />
                    </svg>
                    {s.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {s.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs bg-surface-elevated text-warm-muted px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-accent-secondary/30 hover:text-warm-light transition-all duration-150 cursor-default"
                      >
                        &ldquo;{item}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
