'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchDrawings } from '@/lib/api/drawings-client';
import type { DrawingItem } from '@/lib/api/drawings-client';

export default function DrawingsPage() {
  const router = useRouter();
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrawings()
      .then(setDrawings)
      .catch(() => setError('加载失败，请确认已登录'))
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen(d: DrawingItem) {
    try {
      const res = await fetch(`/api/drawings/${d.id}`);
      const detail = await res.json();
      if (detail.canvas_json) {
        sessionStorage.setItem('load_drawing', JSON.stringify(detail));
        router.push('/');
      }
    } catch {
      setError('打开失败');
    }
  }

  return (
    <main className="min-h-screen bg-surface-deep">
      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-semibold text-warm-light">我的作品</h1>
            <span className="text-[10px] font-mono text-warm-dark bg-surface-elevated px-1.5 py-0.5 rounded">
              {drawings.length}
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-accent-secondary hover:text-accent-secondary/80 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            返回画布
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {error && (
          <div className="mb-6 text-xs text-red-400 bg-red-400/5 border border-red-400/15 rounded-lg px-4 py-3 animate-slide-up">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-6 h-6 text-accent-primary animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-warm-muted">加载中…</p>
            </div>
          </div>
        ) : drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg className="w-16 h-16 text-warm-dark/20 mb-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-warm-muted text-sm mb-1">还没有作品</p>
            <p className="text-warm-dark text-xs">
              回到画布，用语音说&ldquo;保存为作品名称&rdquo;来创建第一幅作品
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {drawings.map((d, i) => (
              <div
                key={d.id}
                onClick={() => handleOpen(d)}
                className="card card-interactive p-3 animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 20) * 40}ms` }}
              >
                <div className="aspect-square bg-surface-deep rounded-lg mb-3 overflow-hidden flex items-center justify-center ring-1 ring-white/[0.04]">
                  {d.thumbnail_url ? (
                    <img
                      src={d.thumbnail_url}
                      alt={d.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-warm-dark/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <p className="text-xs font-medium text-warm-light truncate">{d.title}</p>
                <p className="text-[10px] text-warm-dark mt-1.5 font-mono">
                  {new Date(d.updated_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
