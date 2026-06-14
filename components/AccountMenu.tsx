'use client';

import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';

interface MeResponse {
  id: string | number;
  username: string;
}

export default function AccountMenu() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!cancel && data) setUser(data);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  async function confirmUnsavedIfNeeded(): Promise<boolean> {
    const project = useCanvasStore.getState().project;
    const hasShapes = project.canvases.some((c) => (c.shapes?.length || 0) > 0);
    if (!hasShapes) return true;
    return window.confirm('当前作品可能尚未保存，确定要离开当前账号吗？');
  }

  async function handleLogout() {
    if (busy) return;
    if (!(await confirmUnsavedIfNeeded())) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    useCanvasStore.getState().resetProject();
    setUser(null);
    setOpen(false);
    setBusy(false);
    window.location.href = '/login';
  }

  async function handleSwitch() {
    if (busy) return;
    if (!(await confirmUnsavedIfNeeded())) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    useCanvasStore.getState().resetProject();
    setBusy(false);
    setOpen(false);
    window.location.href = '/login?switch=1';
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="text-xs text-warm-muted hover:text-warm-light px-3 py-1.5 rounded-md border border-white/[0.06] hover:border-white/[0.12] transition-colors"
      >
        登录
      </a>
    );
  }

  const initial = (user.username || '?').slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-8 px-2 pl-1.5 rounded-full bg-surface-elevated/70 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-6 h-6 rounded-full bg-accent-primary/80 text-white text-[11px] font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="text-xs text-warm-light font-medium max-w-[10ch] truncate">
          {user.username}
        </span>
        <svg
          className={`w-3 h-3 text-warm-muted transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 rounded-lg bg-surface-base/95 backdrop-blur-md border border-white/[0.08] shadow-xl shadow-black/30 overflow-hidden z-50 animate-scale-in"
        >
          <div className="px-3 py-2 text-[10px] text-warm-muted border-b border-white/[0.06]">
            当前账号：<span className="text-warm-light">{user.username}</span>
          </div>
          <a
            href="/drawings"
            className="block px-3 py-2 text-xs text-warm-muted hover:bg-white/[0.06] hover:text-warm-light"
            role="menuitem"
          >
            我的作品
          </a>
          <button
            type="button"
            onClick={handleSwitch}
            disabled={busy}
            className="w-full text-left px-3 py-2 text-xs text-warm-muted hover:bg-white/[0.06] hover:text-warm-light disabled:opacity-50"
            role="menuitem"
          >
            切换账号
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
            role="menuitem"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
